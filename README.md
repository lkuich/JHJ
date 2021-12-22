# JHJ

Proof of concept.. Don't use!

![Im in danger](https://c.tenor.com/I6GFaw6IR3YAAAAC/chuckles-im-in-danger.gif)

Bring your Backend into your Frontend, and don't worry about boilerplate communication API's!

Define a Backend function like so in your client page like so, the `script` block marked as `backend`, this will be pulled out of the client and run on the server! Communication between the client and server is handled with websockets.

```html
<script backend>
  const mysql = require('mysql');

  function handleFormSubmit(name, email) {
    console.log(`My name is: ${name} and my email is: ${email}`);
    return `${name} successfully logged in!`;
  }

  console.log('loaded');

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


## TODO:
- Support for routing
- Security scrutiny and sandboxing
- HTML templating
