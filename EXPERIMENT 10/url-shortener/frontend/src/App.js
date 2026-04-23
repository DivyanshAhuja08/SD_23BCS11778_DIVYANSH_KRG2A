import { useState } from "react";
import UrlShortenerForm from "./components/UrlShortenerForm";
import UrlResultCard from "./components/UrlResultCard";

function App() {
  const [result, setResult] = useState(null);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">LinkLite</p>
          <h1>Short links that are fast, clean, and easy to share.</h1>
          <p className="hero-text">
            Turn long URLs into simple shareable links in seconds with a smooth,
            reliable shortening experience.
          </p>
        </div>

        <UrlShortenerForm onSuccess={setResult} />
        <UrlResultCard result={result} />
      </section>
    </main>
  );
}

export default App;
