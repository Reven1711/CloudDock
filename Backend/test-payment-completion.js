// Quick test script to manually complete a payment
import axios from "axios";

const sessionId = process.argv[2];

if (!sessionId) {
  console.log("Usage: node test-payment-completion.js <session_id>");
  console.log("Example: node test-payment-completion.js cs_test_xxxxx");
  process.exit(1);
}

console.log("🧪 Testing payment completion for session:", sessionId);

axios
  .post("http://localhost:4000/billing/storage/complete", {
    sessionId: sessionId,
  })
  .then((response) => {
    console.log("✅ Success!", response.data);
    console.log("Storage added:", response.data.storageAdded, "GB");
    console.log("New quota:", response.data.newQuotaGB, "GB");
  })
  .catch((error) => {
    console.error("❌ Error:", error.response?.data || error.message);
  });
