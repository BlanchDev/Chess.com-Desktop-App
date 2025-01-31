import PropTypes from "prop-types";
import "./TopBar.scss";
import logo from "../../assets/chesscomlogo.webp";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useState, useEffect } from "react";

function TopBar({
  navSize,
  tabs,
  tabsOrder,
  setTabsOrder,
  activeTab,
  setActiveTab,
  closeTab,
  addTab,
  onUrlUpdate,
  onGoBack,
  onGoForward,
  onReload,
  activeTabInfo,
}) {
  const [urlInput, setUrlInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleReorder = (newOrder) => {
    setTabsOrder(newOrder);
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  useEffect(() => {
    if (!isEditing) {
      setUrlInput(activeTabData?.url || "");
    }
  }, [activeTabData?.url, isEditing]);

  const handleUrlChange = (e) => {
    setUrlInput(e.target.value);
  };

  const handleUrlFocus = () => {
    setIsEditing(true);
  };

  const handleUrlBlur = () => {
    setIsEditing(false);
    setUrlInput(activeTabData?.url || "");
  };

  const handleUrlKeyPress = (e) => {
    if (!(e.key === "Enter" && activeTab)) {
      return;
    }

    const validUrl = urlInput.startsWith("https://")
      ? urlInput
      : `https://${urlInput?.replace("http://", "")}`;

    onUrlUpdate(activeTab, validUrl);
    e.target.blur();
  };

  useEffect(() => {
    // Start with notification status
    window.Electron?.ipcRenderer.invoke("get-settings").then((settings) => {
      setNotificationsEnabled(settings.notifications);
    });
  }, []);

  const toggleNotifications = async () => {
    try {
      const settings = await window.Electron?.ipcRenderer.invoke(
        "get-settings",
      );
      const newSettings = {
        ...settings,
        notifications: !settings.notifications,
      };
      await window.Electron?.ipcRenderer.invoke("update-settings", newSettings);
      setNotificationsEnabled(!settings.notifications);
    } catch (error) {
      console.error("Notification settings update error:", error);
    }
  };

  return (
    <div className='topbar column'>
      <div className='top-side row aic'>
        <div
          className='logo-container row aic jcc'
          style={{ width: navSize?.width, maxcWidth: navSize?.width }}
        >
          <img src={logo} alt='logo' className='logo' />
          <span className='logo-text'>Chess Desktop</span>
          <span className='version'>v1.0.0</span>
        </div>
        <div
          className='tabs row aic gap5'
          style={{
            width: `calc(100% - ${navSize?.width}px)`,
            minWidth: `calc(100% - ${navSize?.width}px)`,
          }}
        >
          <Reorder.Group
            axis='x'
            values={tabsOrder}
            onReorder={handleReorder}
            className='tab-group row aic gap5'
          >
            <AnimatePresence>
              {tabsOrder.map((tabId) => {
                const tab = tabs.find((t) => t.id === tabId);
                if (!tab) return null;

                return (
                  <Reorder.Item
                    key={tab.id}
                    value={tab.id}
                    dragOverlay={false}
                    className={`tab-item row aic gap10 ${
                      activeTab && activeTab === tab.id ? "active" : ""
                    }`}
                    layout
                    initial={{
                      opacity: 0,
                      y: 45,
                      transition: { duration: 0.3 },
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.3 },
                    }}
                    exit={{
                      opacity: 0.5,
                      y: -45,
                      transition: { duration: 0.3 },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 700,
                      damping: 50,
                    }}
                    onClick={() => setActiveTab(tab.id)}
                    onDragStart={() => {
                      setActiveTab(tab.id);
                    }}
                  >
                    <span className={`title ${tab.loading ? "loading" : ""}`}>
                      {tab.title}
                    </span>
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className='close-button'
                    >
                      ✕
                    </button>
                  </Reorder.Item>
                );
              })}
            </AnimatePresence>
          </Reorder.Group>

          <motion.button
            onClick={addTab}
            className='add-tab-button'
            layout
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 900,
              damping: 40,
            }}
          >
            +
          </motion.button>
        </div>
      </div>

      <div className='bot-side row aic'>
        <div
          className='left-side-url-buttons row-reverse aic gap5'
          style={{ width: navSize?.width, minWidth: navSize?.width }}
        >
          <div className='row aic gap5'>
            <button
              className='tool-button back-button'
              onClick={() => onGoBack(activeTab)}
              disabled={!activeTabInfo?.canGoBack}
            />
            <button
              className='tool-button forward-button'
              onClick={() => onGoForward(activeTab)}
              disabled={!activeTabInfo?.canGoForward}
            />
            <button
              className='tool-button reload-button'
              onClick={() => onReload(activeTab)}
            />
          </div>
        </div>
        <div
          className='url-bar row'
          style={{
            width: `calc(100% - (${navSize?.width}px))`,
            maxWidth: `calc(100% - (${navSize?.width}px))`,
          }}
        >
          <div className='url-container row aic'>
            <div className='url-icon'>
              {activeTabData?.loading ? (
                <div className='loading-icon' />
              ) : (
                <button
                  className='secure-icon'
                  title='force https navigation'
                />
              )}
            </div>
            <input
              className='url-input'
              value={urlInput}
              onChange={handleUrlChange}
              onKeyDown={handleUrlKeyPress}
              onFocus={handleUrlFocus}
              onBlur={handleUrlBlur}
              spellCheck={false}
              placeholder='Enter a URL'
              disabled={activeTabData?.loading}
            />
          </div>
        </div>
        <div
          className='right-side-url-buttons row aic jcfe gap5'
          style={{ width: navSize?.width, minWidth: navSize?.width }}
        >
          <button
            className={`tool-button notification-test ${
              notificationsEnabled ? "" : "disabled"
            }`}
            onClick={toggleNotifications}
            title={
              notificationsEnabled ? "Notifications Off" : "Notifications On"
            }
          />
          <button
            className='tool-button settings-button'
            onClick={() => window.Electron?.ipcRenderer.invoke("open-settings")}
            title='Settings'
          />
        </div>
      </div>
    </div>
  );
}

TopBar.propTypes = {
  navSize: PropTypes.object.isRequired,
  tabs: PropTypes.array.isRequired,
  tabsOrder: PropTypes.array.isRequired,
  setTabsOrder: PropTypes.func.isRequired,
  activeTab: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  setActiveTab: PropTypes.func.isRequired,
  closeTab: PropTypes.func.isRequired,
  addTab: PropTypes.func.isRequired,
  onUrlUpdate: PropTypes.func.isRequired,
  onGoBack: PropTypes.func.isRequired,
  onGoForward: PropTypes.func.isRequired,
  onReload: PropTypes.func.isRequired,
  activeTabInfo: PropTypes.object,
};

export default TopBar;
