const express = require("express");
const {
  shortenUrl,
  redirectToLongUrl,
} = require("../controllers/urlController");

const router = express.Router();

router.post("/api/shorten", shortenUrl);
router.get("/:shortId", redirectToLongUrl);

module.exports = router;
