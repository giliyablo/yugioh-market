const axios = require('axios');

const deleteJobs = async (status) => {
    try {
        const response = await axios.delete(`http://localhost:4000/delete-jobs?status=${status}`);
        console.log(response.data);
    } catch (error) {
        console.error(`Error deleting jobs: ${error.message}`);
    }
};

const status = process.argv[2] || 'all'; // expecting 'all' or 'completed'
deleteJobs(status);