const axios = require('axios');
axios.post('http://localhost:8000/api/agent/query', { message: "hi" }).catch(e => console.log(e.response ? e.response.status : e.message));
