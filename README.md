# JHJ

Proof of concept.. Don't use..

Bring your backend into your Frontend, and don't worry about communication layers!

Define a backend function like so in your client (note the `script` blocked is marked as `serverside`, this will be pulled out an run on your server):

```html
<script serverside>
  const mysql = require('mysql');

  function handleFormSubmit(name, email) {
    console.log(`My name is: ${name} and my email is: ${email}`);
    return `${name} successfully logged in!`;
  }

  console.log('loaded')

  module.exports = {
    handleFormSubmit
  };
</script>
```

Now, in your client, simply call your server function as if it was available locally, and it retuns a promise!

```html
<script>
  // Submit my form data to the server
  const resopnse = await handleFormSubmit(data.name, data.email)
  console.log(resopnse)
</script>
```

Socket.io is under the hood handling communication between the client and server.

## TODO:
- Support for routing
- Support for multiple `serverside` blocks
- Support for external `serverside` blocks
