import { h, render } from 'https://unpkg.com/preact@latest?module';
import { useState } from 'https://unpkg.com/preact@latest/hooks/dist/hooks.module.js?module';
import htm from "https://unpkg.com/htm@latest/dist/htm.module.js?module";

const html = htm.bind(h);

const App = () => {
  const [counter, setCounter] = useState(0);
  const increment = () => {
    setCounter(counter + 1);
  }
  const decrement = async () => {
    setCounter(counter - 1);

    await handleClick();
  }

  return html`<div>
    <span>${counter}</span>
    <button onClick=${increment}>+</button>
    <button onClick=${decrement}>-</button>
  </div>`;
};

render(h(App), document.body);