const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors')
app.use(
  cors()
)
app.use(express.static('public'))
app.use(express.json())
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
const { open } = require('sqlite');
const dbPath = path.join(__dirname, "shafi.db");
const {jobs} = require('./jobs');

const port = 3001;
let db = null;

const roles = {
  'FULLTIME' : "Full Time",
  'PARTTIME' : "Part Time",
  'FREELANCE': "Freelance",
  'INTERNSHIP':"Internship"
}
const initializeDBAndServer = async () => {
     try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });

        // Move jobs iteration outside
        // jobs.forEach((each) => {
        //   insertData(each);
        // })
    } catch (error) {
        console.log(`DB ERROR ${error.message}`);
        process.exit(1);
    }
};

initializeDBAndServer();

// const insertData = async (each) => {
//   const {id,title,rating,company_logo_url,location,job_description,employment_type,package_per_annum} = each
//   const salary = parseInt(package_per_annum.slice(0,2));
//   const adding = `insert into
//                     jobs   (id,title,rating,company_logo_url,location,job_description,employment_type,package_per_annum) 
//                   values ("${id}","${title}",${rating},"${company_logo_url}","${location}","${job_description}","${employment_type}",${salary})`;
//   const result = await db.run(adding);
//   console.log(`ok ${id}`)
// }

const verifyTheuser = (req,res,next) => {
  let jwtToken;
  const authHeader = req.headers["Authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "shafi_jobby_app", async (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.get('/',async (req,res) => {
  res.send('the server running ')
})

app.post('/login',async (req,res) => {
    const {username , password} = req.body
    const loginQuery = `select * from student where name like '${username}'`;
    const student = await db.get(loginQuery)
    if (student !== undefined){
        if (student.password === password){
            const payload = {
                username: username
            }
          const jwtToken = jwt.sign(payload,"shafi_jobby_app")
          res.status(200)
          res.send({ jwtToken })
        }else{
            res.status(400)
            res.send('Inavlid Password')
        }
    }else{
        res.status(400)
        res.send("Invalid User")
    }
})

app.get('/jobby/jobs/',verifyTheuser,async (req, res) => {
    const defaultTypes = `'${roles.FULLTIME}','${roles.PARTTIME}','${roles.FREELANCE}','${roles.INTERNSHIP}'`;
    const {search="",minimum_package=0,employment_type} = req.query
    let final_types;
    if (employment_type === undefined){
      final_types = defaultTypes
    }else{
      let types = employment_type.split(',')
      let arr = []
      for (let i = 0; i < types.length; i++){
        const type = types[i]
        arr.push(`'${roles[type]}'`);
      }
      final_types = `(${arr.join(',')})`
    }
    const getJobsQuery = `
                SELECT 
                    *
                from    
                    jobs
                where 
                    (title like '%${search}%' and
                    (employment_type in ${final_types} and package_per_annum >= ${minimum_package}));`
    const jobDetails = await db.all(getJobsQuery)
    if (jobDetails !== undefined){
            res.status(200)
            res.send(jobDetails);
    }else{
        res.status(400)
        res.send('no data available!');
    }
});
