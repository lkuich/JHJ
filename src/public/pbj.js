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
  const div = document.createElement('div');

  for (const child of children) {
    if (typeof child === 'function') {
      frag.append(child(setState));
    }
    else
      frag.append(child);
  }


  for (const propName in props) {
    if (props.hasOwnProperty(propName)) {
      div.setAttribute(propName, props[propName]);
    }
  }

  div.appendChild(frag);

  function setState(content) {
    const parent = div.parentNode;
    parent.replaceChild(content, div);
  }

  return div;
}

function P({ text, props }) {
  const p = document.createElement('p');
  
  for (const propName in props) {
    if (props.hasOwnProperty(propName)) {
      p.setAttribute(propName, props[propName]);
    }
  }

  p.innerHTML = text;

  return p;
}

function Button({ text, onClick, props }) {
  const button = document.createElement('button');
  
  for (const propName in props) {
    if (props.hasOwnProperty(propName)) {
      button.setAttribute(propName, props[propName]);
    }
  }

  button.innerText = text;
  button.onclick = onClick;

  return button;
}
