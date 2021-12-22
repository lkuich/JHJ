# JHJ

<img src="https://m.media-amazon.com/images/I/61AXLjhl6OL._SL1007_.jpg" height="320">

Bring your Backend into your Frontend without tears; and don't worry about boilerplate communication API's!

Define a Backend function in your client page like so, the `script` block marked as `backend` will be pulled out of the client and run on the server! Communication between the client and server is handled with websockets.

```html
<script backend>
  const mysql = require('mysql');

  function handleFormSubmit(name, email) {
    console.log(`My name is: ${name} and my email is: ${email}`);
    return `${name} successfully logged in!`;
  }

  console.log('Component loaded');

  // Note we must export our functions!
  module.exports = {
    handleFormSubmit
  };
</script>
```

This also supports external files:

```html
<script src="external.js" backend></script>
```

```html
<script src="https://mylibrary.com/external.js" backend></script>
```

Now, in your client script block, simply call your server function by name, as if it was available locally. Your function will return as a standard Promise.

```html
<script>
  // Submit my form data to the server
  const response = await handleFormSubmit(name, email)
  console.log(response)
</script>
```

JHJ also supports basic templating, so you can re-use app components. For example, in your `src/index.html` file, you can pull in `src/app.html` like this:

```html
<body>
  <p>Main body</p>
  <div data-src="app.html"></div>
</body>
```

At startup, this will replace the `div` marked with `data-src` with the source of `app.html`. This is great for nesting and isolating certain server-side functionality to a specific component.

## Examples

See `src/index.html` and `src/app.html` for more complete examples. Here's an example of a complete app!

```html
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Login Form</title>

    <link rel="stylesheet" href="style.css">
  </head>

  <body>
    <p>Login Form</p>

    <form id="form" onsubmit="return false;">
      <input type="text" name="name" placeholder="Name">
      <input type="text" name="email" placeholder="Email">
      <button type="submit">Submit</button>
    </form>
    <div id="result"></div>

    <script backend>
      const mysql = require('mysql');

      function handleFormSubmit(name, email) {
        console.log(`My name is: ${name} and my email is: ${email}`);
        // Retreive my users information from our database...
        return `${name} successfully logged in!`;
      }

      module.exports = {
        handleFormSubmit
      };
    </script>

    <script>
      window.onload = async function() {
        async function handleSubmit(e) {
          const formData = new FormData(e.target);
          const data = {};
          for (var [key, value] of formData.entries()) {
            data[key] = value;
          }

          // Submit form data to the server, and await the response from the socket
          const response = await handleFormSubmit(data.name, data.email);
          console.log(response);

          document.getElementById('result').innerHTML = response;
        }

        const form = document.getElementById('form');
        form.addEventListener('submit', handleSubmit);
      }
    </script>
  </body>

</html>
```

## TODO:
- Support for routing
- Security scrutiny and sandboxing
- Compile option for static site generation
