/**
 * Utility for abstracting out LLM vendor (OpenAI/Anthropic/Local).
 * Simulates network delay and deterministic output based on prompt context.
 */
export async function llmInvoke(prompt: string): Promise<string> {
  // Simulating 500ms network delay.
  await new Promise(r => setTimeout(r, 500));

  // Simulate a hallucination/failure 5% of the time to test resilience
  if (Math.random() > 0.95) throw new Error("LLM Hallucination/Timeout");

  // If prompt is for Improvement Plan
  if (prompt.includes("career mentor") || prompt.includes("Improvement Plan")) {
    return JSON.stringify({
      strengths: ["Strong problem-solving methodology", "Clear communication of complex ideas"],
      criticalWeakness: "Requires deeper optimization knowledge for large-scale systemic design",
      actionableNextSteps: [
        "Review advanced caching patterns (Redis/Memcached)",
        "Practice highly scalable system design questions",
        "Engage more confidently when explaining trade-offs"
      ]
    });
  }

  // Fallback (e.g. for Room Assignment Match Score)
  return JSON.stringify({ matchReason: "Strong candidate matching role requirements.", matchScore: 90 });
}
