export const getAvatarGradient = (name) => {
  if (!name) return 'var(--primary)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Keep the hue in a positive range
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 80%, 65%), hsl(${h2}, 90%, 45%))`;
};

const slangDictionary = [
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'bastard', 'slut', 'whore', 'fag', 'nigger', 'nigga', 'retard'
];

export const censorText = (text) => {
  if (!text) return { censoredText: text, isToxic: false };
  let isToxic = false;
  let censoredText = text;
  
  slangDictionary.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(censoredText)) {
      isToxic = true;
      censoredText = censoredText.replace(regex, '*'.repeat(word.length));
    }
  });
  
  return { censoredText, isToxic };
};
