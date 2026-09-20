import { describe, expect, it } from 'vitest';
import { classifyUserIntent } from '../providerAdapter';
import { routeResearchRequest } from '../../../core/research';

describe('intent classifier', () => {
  it('does not mistake Nigerian Pidgin conversation verbs for image requests', () => {
    const result = classifyUserIntent('Abeg, make we go now');
    expect(result.capability).toBe('chat');
    expect(classifyUserIntent('Let me make a plan for tomorrow').capability).toBe('chat');
  });

  it('keeps normal English conversation on the chat capability', () => {
    expect(classifyUserIntent('How can I plan a better study schedule?').capability).toBe('chat');
  });

  it('keeps mixed English and Pidgin conversation on the chat capability', () => {
    expect(classifyUserIntent('Abeg help me understand this question').capability).toBe('chat');
  });

  it('does not confuse Edo/Bini language input with a capability request', () => {
    expect(classifyUserIntent('Kọyọ, vbèè oye hẹ?').capability).toBe('chat');
  });

  it('routes image requests independently of Nigerian language', () => {
    expect(classifyUserIntent('Abeg make a picture of a lion').capability).toBe('image');
    expect(classifyUserIntent('Ṣe aworan ti Lagos ni alẹ').capability).toBe('image');
  });

  it('keeps coding requests as chat until a dedicated coding capability exists', () => {
    expect(classifyUserIntent('Biko, help me debug this Igbo dictionary function').capability).toBe('chat');
  });

  it('keeps Hausa general questions as chat', () => {
    expect(classifyUserIntent('Sannu, yaya aiki?').capability).toBe('chat');
  });

  it('detects language requests in Nigerian Pidgin phrasing', () => {
    const result = classifyUserIntent('Abeg help me translate this to Edo');
    expect(result.capability).toBe('language');
    expect(result.targetLanguage).toBe('edo');
  });

  it('detects image generation requests', () => {
    const result = classifyUserIntent('Generate an image of Benin City at sunset');
    expect(result.capability).toBe('image');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects translation and target language', () => {
    const result = classifyUserIntent('Translate this into Edo');
    expect(result.capability).toBe('language');
    expect(result.targetLanguage).toBe('edo');
  });

  it('detects search and research requests', () => {
    const result = classifyUserIntent('Search the web for the latest information on African AI');
    expect(result.capability).toBe('search');
  });

  it('detects document and spreadsheet tasks', () => {
    const result = classifyUserIntent('Clean this spreadsheet and summarize the totals');
    expect(result.capability).toBe('document');
  });

  it('detects music and voice requests', () => {
    const music = classifyUserIntent('Compose an Afrobeats song about Lagos');
    const voice = classifyUserIntent('Read this aloud in a calm voice');
    expect(music.capability).toBe('music');
    expect(voice.capability).toBe('tts');
  });

  it('keeps a multi-intent request stable while reporting secondary capabilities', () => {
    const result = classifyUserIntent('Search the web and generate an image of Lagos at night');
    expect(result.capability).toBe('image');
    expect(result.secondaryCapabilities).toContain('search');
  });

  it('preserves a targeted language request when combined with another task', () => {
    const result = classifyUserIntent('Translate this into Edo and summarize it');
    expect(result.capability).toBe('language');
    expect(result.targetLanguage).toBe('edo');
  });

  it('routes medical reasoning requests through the research capability', () => {
    const result = classifyUserIntent('I have fever, cough, and body aches for two days');
    expect(result.capability).toBe('research');
  });

  it('routes One Health cross-domain requests through the research capability', async () => {
    const result = classifyUserIntent('My goats and nearby people are coughing after the rains');
    expect(result.capability).toBe('research');
    const response = await routeResearchRequest('My goats and nearby people are coughing after the rains');
    expect(response).not.toBeNull();
    expect(response?.domain).toContain('one_health');
  });
});
