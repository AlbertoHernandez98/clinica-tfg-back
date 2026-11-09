const mysql = require('mysql');
const fs = require('fs');
const path = require('path');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  multipleStatements: true,
});

const sqlFile = 'c:\\Users\\loval\\Documents\\GitHub\\clinica-TFG\\instalacion\\CODIGO OK SQL SCRIPT BBDD.sql';
const sql = fs.readFileSync(sqlFile, 'utf8');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL');

  connection.query(sql, (error, results) => {
    if (error) {
      console.error('Error executing SQL:', error);
      connection.end();
      process.exit(1);
    }
    console.log('SQL executed successfully!');
    console.log('Database and tables created.');
    connection.end();
  });
});
