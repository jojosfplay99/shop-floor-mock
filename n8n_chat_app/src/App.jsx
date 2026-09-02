import { useEffect, useRef } from "react";
import { createChat } from "@n8n/chat";
import "@n8n/chat/dist/chat.css";

// Set VITE_N8N_WEBHOOK_URL in a .env file — see .env.example.
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export default function App() {
  const mounted = useRef(false);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (!WEBHOOK_URL) return;

    // Guard against double-mount in React.StrictMode (dev only)
    if (mounted.current) return;
    mounted.current = true;

    createChat({
      webhookUrl: WEBHOOK_URL,
      target: chatContainerRef.current,
      mode: "fullscreen",
      showWelcomeScreen: true,
      initialMessages: [
        "Hi there! 👋",
        "Send a message to run the connected workflow.",
      ],
      i18n: {
        en: {
          title: "Assistant",
          subtitle: "",
          inputPlaceholder: "Message the workflow…",
        },
      },
    });
  }, []);

  if (!WEBHOOK_URL) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
        <h1>Missing webhook URL</h1>
        <p>
          Set <code>VITE_N8N_WEBHOOK_URL</code> in a <code>.env</code> file
          at the project root (copy <code>.env.example</code> to{" "}
          <code>.env</code> and fill in your n8n Chat Trigger's Production
          webhook URL), then restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={chatContainerRef}
      style={{ height: "100vh", width: "100vw" }}
    />
  );
}

