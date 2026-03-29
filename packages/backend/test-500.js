const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: '111111111111111111111111', collegeId: '69c144ca76b388ea135b9e9b', email: 'test@test.com' },
  'your-random-access-secret-64-char'
);

async function test() {
  const res = await fetch('http://localhost:5000/api/v1/drives/69c64031ca5ddb1da50ba94a', {
    headers: { Authorization: "Bearer " + token }
  });
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
}
test();
