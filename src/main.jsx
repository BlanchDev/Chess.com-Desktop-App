import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import PropTypes from "prop-types";
import App from "./App";
import "./global.scss";

// React 18 Concurrent Mode
const container = document.getElementById("root");
const root = createRoot(container);

// Error boundary ile sarmalama
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    console.error("Error caught by boundary:", error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

// Uygulamayı render et
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
