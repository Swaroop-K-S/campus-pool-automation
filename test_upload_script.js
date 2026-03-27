const fs=require('fs');
const FormData=require('form-data');
const axios=require('axios');
const form=new FormData();
form.append('98b50e2ddc9943efb387052637738f61', 'Api Test App 14');
form.append('98b50e2ddc9943efb387052637738f62', '1RV22CS111');
form.append('98b50e2ddc9943efb387052637738f63', 'apitest14@example.com');
form.append('resume', fs.createReadStream('test_resume.pdf'));
form.append('photo', fs.createReadStream('test_photo.jpg'));

console.log('Starting upload...');
axios.post('http://localhost:5000/api/v1/form/ODliNTI5MDQtNWE4MC00ZDA2LTg5ZDUtMDJhZGM4NjllNjRl/submit', form, {
  headers: form.getHeaders(),
  timeout: 30000 
})
.then(r => console.log('SUCCESS:', r.data))
.catch(e => console.error('ERROR:', e.response ? e.response.data : e.message));
