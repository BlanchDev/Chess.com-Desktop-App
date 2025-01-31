import { useEffect, useState, useRef, useCallback } from "react";
import TopBar from "./components/TopBar/TopBar";
import LoadingStick from "./components/LoadingStick/LoadingStick";

const MAX_TABS = 12;

function App() {
  const [tabs, setTabs] = useState([]);
  const [tabsOrder, setTabsOrder] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [navSize, setNavSize] = useState({ width: 145, height: 0 });

  const webviewRefs = useRef({});
  const initialTabCreated = useRef(false);

  // Yeni sekme ekle
  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) {
      return;
    }

    const newTab = {
      id: Date.now(),
      url: "https://www.chess.com",
      title: "New Tab",
      loading: true,
      error: null,
      canGoBack: false,
      canGoForward: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setTabsOrder((prev) => [...prev, newTab.id]);
    setActiveTab(newTab.id);
  }, [tabs.length]);

  // Sekmeleri sırala
  const handleReorderTabs = useCallback((newOrder) => {
    setTabsOrder(newOrder);
  }, []);

  // İlk sekmeyi aç
  useEffect(() => {
    if (!initialTabCreated.current) {
      initialTabCreated.current = true;
      addTab();
    }
  }, [addTab]);

  useEffect(() => {
    // Yeni sekme açma isteklerini dinle
    const unsubscribe = window.Electron?.ipcRenderer.on("new-tab", (url) => {
      if (!url || tabs.length >= MAX_TABS) return;

      // Yeni sekme oluştur
      const newTab = {
        id: Date.now(),
        url: url,
        title: "Loading...",
        loading: true,
        error: null,
        canGoBack: false,
        canGoForward: false,
      };

      // Sekmeyi ekle ve aktif yap
      setTabs((prev) => [...prev, newTab]);
      setTabsOrder((prev) => [...prev, newTab.id]);
      setActiveTab(newTab.id);

      // Kısa bir gecikme sonra URL'i yükle
      setTimeout(() => {
        const webview = webviewRefs.current[newTab.id]?.webview;
        if (webview) {
          webview.loadURL(url);
        }
      }, 250);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [tabs.length]);

  // Webview olaylarını ayarla
  const handleWebviewRef = (webview, tabId) => {
    if (!webview || webviewRefs.current[tabId]?.webview === webview) {
      return;
    }

    if (webviewRefs.current[tabId]?.cleanup) {
      webviewRefs.current[tabId].cleanup();
    }

    let isValid = true;

    const handleDomReady = () => {
      if (!isValid) return;
      try {
        webview.setZoomLevel(0);
        webview.setZoomFactor(1);
      } catch (error) {
        console.debug("DOM ready error:", error);
      }
    };

    const handleLoadStart = () => {
      if (!isValid) return;
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, loading: true, error: null } : tab,
        ),
      );
    };

    const handleLoadStop = () => {
      if (!isValid) return;
      const currentUrl = webview.getURL();
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, url: currentUrl, loading: false } : tab,
        ),
      );
    };

    const handleTitleUpdate = (event) => {
      if (!isValid) return;
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, title: event.title } : tab,
        ),
      );
    };

    const handleNavigate = () => {
      if (!isValid) return;

      const currentUrl = webview.getURL();
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId
            ? {
                ...tab,
                url: currentUrl,
                canGoBack: webview.canGoBack(),
                canGoForward: webview.canGoForward(),
              }
            : tab,
        ),
      );
    };

    const handleNewWindow = (event) => {
      if (!isValid) return;
      event.preventDefault();

      if (!event.url || tabs.length >= MAX_TABS) return;

      // Yeni sekme ekle
      addTab();
    };

    // Event listener'ları ekle
    webview.addEventListener("dom-ready", handleDomReady);
    webview.addEventListener("page-title-updated", handleTitleUpdate);
    webview.addEventListener("did-start-loading", handleLoadStart);
    webview.addEventListener("did-stop-loading", handleLoadStop);
    webview.addEventListener("new-window", handleNewWindow);
    webview.addEventListener("did-navigate", handleNavigate);
    webview.addEventListener("did-navigate-in-page", handleNavigate);

    // Cleanup fonksiyonunu güncelle
    webviewRefs.current[tabId] = {
      webview,
      cleanup: () => {
        isValid = false;
        webview.removeEventListener("dom-ready", handleDomReady);
        webview.removeEventListener("page-title-updated", handleTitleUpdate);
        webview.removeEventListener("did-start-loading", handleLoadStart);
        webview.removeEventListener("did-stop-loading", handleLoadStop);
        webview.removeEventListener("new-window", handleNewWindow);
        webview.removeEventListener("did-navigate", handleNavigate);
        webview.removeEventListener("did-navigate-in-page", handleNavigate);
      },
    };
  };

  // Sekmeyi kapat
  const closeTab = useCallback(
    (tabId, e) => {
      e?.stopPropagation();

      if (tabs.length === 1) {
        addTab();
      }

      setTabs((prev) => prev.filter((tab) => tab.id !== tabId));
      setTabsOrder((prev) => prev.filter((id) => id !== tabId));

      if (activeTab === tabId) {
        const remainingTabs = tabs.filter((tab) => tab.id !== tabId);
        if (remainingTabs.length > 0) {
          setActiveTab(remainingTabs[remainingTabs.length - 1].id);
        }
      }

      // Cleanup webview
      if (webviewRefs.current[tabId]?.cleanup) {
        webviewRefs.current[tabId].cleanup();
        delete webviewRefs.current[tabId];
      }
    },
    [tabs, activeTab, addTab],
  );

  // Webview navigasyon fonksiyonları
  const handleGoBack = useCallback((tabId) => {
    const webview = webviewRefs.current[tabId]?.webview;
    if (!webview) return;

    try {
      if (webview.canGoBack()) {
        webview.goBack();
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  loading: true,
                  canGoBack: webview.canGoBack(),
                  canGoForward: webview.canGoForward(),
                }
              : tab,
          ),
        );
      }
    } catch (error) {
      console.debug("Go back error:", error);
    }
  }, []);

  const handleGoForward = useCallback((tabId) => {
    const webview = webviewRefs.current[tabId]?.webview;
    if (!webview) return;

    try {
      if (webview.canGoForward()) {
        webview.goForward();
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  loading: true,
                  canGoBack: webview.canGoBack(),
                  canGoForward: webview.canGoForward(),
                }
              : tab,
          ),
        );
      }
    } catch (error) {
      console.debug("Go forward error:", error);
    }
  }, []);

  const handleReload = useCallback((tabId) => {
    const webview = webviewRefs.current[tabId]?.webview;
    if (!webview) return;

    try {
      webview.reload();
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, loading: true } : tab)),
      );
    } catch (error) {
      console.debug("Reload error:", error);
    }
  }, []);

  // URL güncelleme
  const handleUrlUpdate = useCallback((tabId, newUrl) => {
    const webview = webviewRefs.current[tabId]?.webview;
    if (!webview || !newUrl) return;

    try {
      webview.loadURL(newUrl);
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, loading: true } : tab)),
      );
    } catch (error) {
      console.debug("URL load error:", error);
    }
  }, []);

  // Component unmount cleanup
  useEffect(() => {
    const currentRefs = webviewRefs.current;
    return () => {
      Object.values(currentRefs).forEach(({ cleanup }) => {
        if (cleanup) {
          cleanup();
        }
      });
    };
  }, []);

  useEffect(() => {
    const handleDomReady = async () => {
      try {
        const size = await window.Electron?.ipcRenderer.invoke(
          "get-element-size",
          ".nav-component",
        );
        if (
          size &&
          (size.width !== navSize?.width || size.height !== navSize?.height)
        ) {
          console.log("Nav component size changed:", size);
          setNavSize(size);
        }
      } catch (error) {
        console.debug("Error getting element size:", error);
      }
    };

    const handleWebviewDomReady = () => {
      handleDomReady();
    };

    const webview = webviewRefs.current[activeTab]?.webview;
    if (webview) {
      webview.addEventListener("dom-ready", handleWebviewDomReady);
    }

    return () => {
      const webview = webviewRefs.current[activeTab]?.webview;
      if (webview) {
        webview.removeEventListener("dom-ready", handleWebviewDomReady);
      }
    };
  }, [navSize, activeTab]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#262421",
      }}
    >
      <TopBar
        navSize={navSize}
        tabs={tabs}
        tabsOrder={tabsOrder}
        setTabsOrder={handleReorderTabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        closeTab={closeTab}
        addTab={addTab}
        onUrlUpdate={handleUrlUpdate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        activeTabInfo={tabs.find((tab) => tab.id === activeTab)}
      />

      <div style={{ flex: 1, position: "relative" }}>
        {tabs.flatMap((tab) => (
          <div
            key={`div-${tab.id}`}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              display: activeTab === tab.id ? "flex" : "none",
            }}
          >
            {tab.loading && <LoadingStick />}
            {tab.error && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  padding: "20px",
                  background: "#312E2B",
                  borderRadius: "8px",
                  color: "#fff",
                  zIndex: 1000,
                }}
              >
                {tab.error}
              </div>
            )}
            <webview
              key={`webview-${tab.id}`}
              ref={(webview) => handleWebviewRef(webview, tab.id)}
              src='https://www.chess.com'
              className='webview'
              style={{
                display: activeTab === tab.id ? "flex" : "none",
                flex: 1,
                opacity: tab.loading ? 0.9 : 1,
              }}
              data-partition='persist:chess'
              allowpopups='true'
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
