const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'test'
});

connection.connect((err) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  connection.query('SELECT * FROM persona LIMIT 5', (error, results) => {
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Personas encontradas:', results.length);
      console.log(results);
    }
    connection.end();
  });
});
