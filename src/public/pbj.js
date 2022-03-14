function App(_body, { children }) {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (typeof child === 'function') {
      frag.appendChild(child({}));
    }
    else
      frag.appendChild(child);
  }

  _body.appendChild(frag);
}

function Div({ children, props }) {
  const frag = document.createDocumentFragment();
  const div = GObject('div', props);

  for (const child of children) {
    if (typeof child === 'function') {
      frag.append(child(setState));
    }
    else
      frag.append(child);
  }

  div.appendChild(frag);

  function setState(content) {
    const parent = div.parentNode;
    parent.replaceChild(content, div);
  }

  return div;
}

function P({ text, props }) {
  const p = GObject('p', props);
  
  p.innerText = text;

  return p;
}

function Button({ text, onClick, props }) {
  const button = GObject('button', props);

  button.innerText = text;
  button.onclick = onClick;

  return button;
}

function GObject(type, props) {
  const go = document.createElement(type);
  for (const propName in props) {
    go.setAttribute(propName, props[propName]);
  }

  return go;
}