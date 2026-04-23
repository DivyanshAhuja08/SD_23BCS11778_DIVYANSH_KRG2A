import { useState } from "react";

function UrlResultCard({ result }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const handleCopy = async () => {
    if (!result?.shortUrl) {
      return;
    }

    try {
      setCopyError("");
      await navigator.clipboard.writeText(result.shortUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopyError("Copy failed. Please copy the short URL manually.");
    }
  };

  if (!result) {
    return (
      <section className="result-card muted-card">
        <p className="muted-title">Your shortened link will appear here.</p>
        <p className="muted-text">
          Paste a URL above to generate a clean short link you can share anywhere.
        </p>
      </section>
    );
  }

  return (
    <section className="result-card">
      <div className="result-row">
        <span className="result-label">Short URL</span>
        <a
          className="result-link"
          href={result.shortUrl}
          target="_blank"
          rel="noreferrer"
        >
          {result.shortUrl}
        </a>
      </div>

      <div className="result-row">
        <span className="result-label">Original URL</span>
        <span className="result-value truncate">{result.longUrl}</span>
      </div>

      <div className="result-actions">
        <button className="secondary-button" type="button" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {copyError ? <p className="message error-message">{copyError}</p> : null}
    </section>
  );
}

export default UrlResultCard;
