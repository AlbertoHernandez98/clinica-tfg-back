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
  
  connection.query('DESCRIBE persona', (error, results) => {
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Estructura de tabla persona:');
      console.log(results);
    }
    connection.end();
  });
});
