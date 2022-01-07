# JHJ

<img src="https://user-images.githubusercontent.com/7741982/147153729-8e75d42b-d818-40c8-8922-ecf3143fe6d1.gif">

Bring your backend into your frontend for your web-app, and don't worry about boilerplate communication API's; what could go wrong!

Define a Backend function in your client page like so, the `script` block marked as `backend` will be pulled out of the document and run on the Express server! Communication between the client and server is handled with websockets.

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

Now, add another script block and simply call your server function by name, as if it was available locally in the client. Your server function will return as a standard Promise.

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

<script>
  // Submit my form data to the server
  const response = await handleFormSubmit(name, email);
  console.log(response);
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

## Quickstart

- Clone the project
- Place your HTML files in `src/`
- Files placed in `public/` will be served statically
- Define Express routes in `lib/routes.js`, and point to your entry HTML document
- Run the project with: `yarn debug`
- You can further configure the Express server in `index.js`

## Examples

See `src/index.html` and `src/app.html` for more complete examples. Here's an example of an app!

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

          // The exported function signature was sent back and stored in the client
          // Submit form data to the server, and await the response from the socket
          const response = await handleFormSubmit(data.name, data.email);
      
          // We got our response!
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

## Notes

This is just a proof-of-concept, with very little security scrutiny and no sense of scale!