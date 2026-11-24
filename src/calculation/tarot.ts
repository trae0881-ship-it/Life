export const TAROT_SPREADS = ["single", "three-card", "past-present-future"] as const;
export type TarotSpread = (typeof TAROT_SPREADS)[number];
export const TAROT_TOPICS = ["general", "relationship", "career"] as const;
export type TarotTopic = (typeof TAROT_TOPICS)[number];

export const TAROT_CARDS = [
  { id: "fool", name: "The Fool", upright: "Openness to a beginning, curiosity and willingness to explore.", reversed: "Pause to check assumptions and prepare before taking a new step." },
  { id: "magician", name: "The Magician", upright: "Attention to available tools, skill and focused effort.", reversed: "Review priorities and avoid scattering effort across too many goals." },
  { id: "high-priestess", name: "The High Priestess", upright: "Quiet reflection, patience and attention to what is not yet clear.", reversed: "Seek clarity and distinguish intuition from untested assumptions." },
  { id: "empress", name: "The Empress", upright: "Nurturing, creative growth and care for what is developing.", reversed: "Restore balance and make room for your own needs." },
  { id: "emperor", name: "The Emperor", upright: "Structure, boundaries and deliberate responsibility.", reversed: "Reconsider rigid plans and make space for collaboration." },
  { id: "hierophant", name: "The Hierophant", upright: "Learning from a tradition, mentor or shared practice.", reversed: "Question whether inherited expectations still fit your values." },
  { id: "lovers", name: "The Lovers", upright: "Values, meaningful connection and choices made with care.", reversed: "Clarify needs and address mismatched expectations honestly." },
  { id: "chariot", name: "The Chariot", upright: "Directed effort, self-discipline and steady movement.", reversed: "Check whether competing priorities are pulling in different directions." },
  { id: "strength", name: "Strength", upright: "Patient courage, compassion and calm persistence.", reversed: "Treat yourself gently and choose a sustainable pace." },
  { id: "hermit", name: "The Hermit", upright: "Solitude, reflection and thoughtful examination.", reversed: "Consider reconnecting with trusted people instead of withdrawing." },
  { id: "wheel", name: "Wheel of Fortune", upright: "Change, cycles and the limits of controlling circumstances.", reversed: "Focus on what is within your control during an uncertain period." },
  { id: "justice", name: "Justice", upright: "Fair consideration, accountability and clear-eyed choices.", reversed: "Review missing information and take responsibility where needed." },
  { id: "hanged-man", name: "The Hanged Man", upright: "A pause that allows a different perspective to emerge.", reversed: "Notice where delay has stopped being useful and choose a small next step." },
  { id: "death", name: "Death", upright: "An ending, transition or release of something no longer useful.", reversed: "Reflect on what is difficult to let go of and proceed at a considered pace." },
  { id: "temperance", name: "Temperance", upright: "Balance, patience and bringing different needs into conversation.", reversed: "Look for excess or imbalance and adjust one thing at a time." },
  { id: "devil", name: "The Devil", upright: "Notice attachments, habits or constraints that deserve examination.", reversed: "Consider practical steps toward healthier boundaries and choices." },
  { id: "tower", name: "The Tower", upright: "A disruption can invite reassessment of assumptions and foundations.", reversed: "Address a concern early rather than relying on avoidance." },
  { id: "star", name: "The Star", upright: "Renewal, hope and patient attention to what restores you.", reversed: "Choose small, realistic sources of support while confidence rebuilds." },
  { id: "moon", name: "The Moon", upright: "Uncertainty, imagination and the need to seek clearer information.", reversed: "Separate what is known from what is feared or assumed." },
  { id: "sun", name: "The Sun", upright: "Warmth, clarity and appreciation of visible progress.", reversed: "Recognize progress even when circumstances are not perfect." },
  { id: "judgement", name: "Judgement", upright: "Review, learning from experience and a considered renewal.", reversed: "Release unhelpful self-criticism and decide what lesson is actionable." },
  { id: "world", name: "The World", upright: "Completion, integration and recognition of a stage reached.", reversed: "Identify what remains unfinished and define a manageable closing step." },
] as const;

export type TarotCardId = (typeof TAROT_CARDS)[number]["id"];

export function createTarotReading(input: { spread: TarotSpread; topic: TarotTopic; cards: { id: TarotCardId; reversed: boolean }[] }) {
  if (!TAROT_SPREADS.includes(input.spread) || !TAROT_TOPICS.includes(input.topic)) throw new Error("Choose a supported Tarot spread and topic.");
  const required = input.spread === "single" ? 1 : 3;
  if (!Array.isArray(input.cards) || input.cards.length !== required) throw new Error(`This spread requires exactly ${required} card${required === 1 ? "" : "s"}.`);
  const selected = input.cards.map(({ id, reversed }, index) => {
    const card = TAROT_CARDS.find((entry) => entry.id === id);
    if (!card || typeof reversed !== "boolean" || input.cards.some((other, otherIndex) => otherIndex < index && other.id === id)) {
      throw new Error("Choose distinct cards and a valid upright or reversed orientation.");
    }
    return {
      id: card.id,
      name: card.name,
      orientation: reversed ? "Reversed" as const : "Upright" as const,
      meaning: reversed ? card.reversed : card.upright,
      position: input.spread === "single" ? "Guidance" : input.spread === "past-present-future" ? ["Past", "Present", "Future"][index] : ["Situation", "Reflection", "Next step"][index],
    };
  });
  const topicLabel = input.topic === "relationship" ? "Relationship reflection" : input.topic === "career" ? "Career reflection" : "General reflection";
  return {
    title: `Tarot · ${topicLabel}`,
    spread: input.spread,
    topic: input.topic,
    cards: selected,
    interpretation: selected.map((card) => `${card.position}: ${card.name} (${card.orientation}) — ${card.meaning}`).join("\n\n"),
    disclaimer: "Tarot is a reflective cultural practice, not a scientifically validated prediction. This reading is for entertainment and reflection, not professional or safety-critical advice.",
  };
}

export function drawTarotCards(count: number): { id: TarotCardId; reversed: boolean }[] {
  if (!Number.isInteger(count) || count < 1 || count > 3) throw new Error("Draw between one and three cards.");
  const deck = [...TAROT_CARDS];
  const cards: { id: TarotCardId; reversed: boolean }[] = [];
  for (let index = 0; index < count; index++) {
    const random = new Uint32Array(2);
    crypto.getRandomValues(random);
    const cardIndex = random[0] % deck.length;
    const [card] = deck.splice(cardIndex, 1);
    cards.push({ id: card.id, reversed: random[1] % 2 === 1 });
  }
  return cards;
}
