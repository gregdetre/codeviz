import { greet } from './util.js';

export function renderGreeting(name) {
  // Using a simple string instead of actual JSX to avoid JSX parsing concerns
  // The file extension ensures we exercise .jsx discovery.
  const message = greet(name);
  return `<div class="greeting">${message}</div>`;
}


