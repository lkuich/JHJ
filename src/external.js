function handleFormSubmit(name, email) {
  console.log(`My name is: ${name} and my email is: ${email}`);
  return `${name} successfully logged in!`;
}

console.log('loaded')

module.exports = {
  handleFormSubmit
};