const formData = new FormData();
formData.append('Email', 'dfggbrtehet@gmai.com');
formData.append('Phone', '7483570185');

// Hitting the ACTUAL token found in the database
fetch('http://localhost:5000/api/v1/form/MzM1Y2I2MGItNGE3OC00NGVhLTk0YjMtMWYzMDc2MTVlZDY5/submit', {
  method: 'POST',
  body: formData
}).then(r => r.text()).then(data => console.log('Response:', data)).catch(console.error);
