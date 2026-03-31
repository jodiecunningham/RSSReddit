const DEFAULT_MULTIREDDIT_PATH = `
LocalLLaMA+SelfHosting+accelerate+hackernews+homelab+huggingface+kubernetes+unsloth
`;

const DEFAULT_SUBREDDITS = DEFAULT_MULTIREDDIT_PATH
  .trim()
  .split('+')
  .filter(Boolean);

export default DEFAULT_SUBREDDITS;
