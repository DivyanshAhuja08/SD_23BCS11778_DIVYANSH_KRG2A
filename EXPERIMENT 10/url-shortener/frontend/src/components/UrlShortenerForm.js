import { useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
const formatDateTimeLocalValue = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

function UrlShortenerForm({ onSuccess }) {
  const [longUrl, setLongUrl] = useState("");
  const [customExpiryDate, setCustomExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/shorten`, {
        longUrl,
        customExpiryDate: customExpiryDate || undefined,
      });
      onSuccess(response.data);
      setLongUrl("");
      setCustomExpiryDate("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Something went wrong while shortening the URL."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="shortener-form" onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="longUrl">
        Paste your long URL
      </label>

      <div className="field-stack">
        <input
          id="longUrl"
          className="url-input"
          type="url"
          placeholder="https://example.com/very/long/link"
          value={longUrl}
          onChange={(event) => setLongUrl(event.target.value)}
          required
        />

        <div className="expiry-row">
          <label className="field-label secondary-label" htmlFor="customExpiryDate">
            Custom expiry date
          </label>
          <input
            id="customExpiryDate"
            className="url-input"
            type="datetime-local"
            value={customExpiryDate}
            onChange={(event) => setCustomExpiryDate(event.target.value)}
            min={formatDateTimeLocalValue(new Date(Date.now() + 60_000))}
          />
          <p className="helper-text">Leave this empty to use the default 30-day expiry.</p>
        </div>
      </div>

      <div className="input-row">
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Generating..." : "Shorten URL"}
        </button>
      </div>

      {error ? <p className="message error-message">{error}</p> : null}
    </form>
  );
}

export default UrlShortenerForm;
