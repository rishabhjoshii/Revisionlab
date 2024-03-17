const express = require('express');
const mongoose = require('mongoose');
const zod = require('zod');
const {Dsa, User} = require('./db');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const userSchema = zod.object({
    username : zod.string(),
    email : zod.string().email(),
    password : zod.string()
})

const jwtSecretKey = "hggfdgffxfdgrs77888";
const salt = bcrypt.genSaltSync(10);


mongoose.connect(process.env.DATABASE_URL)
    .then(()=> {
        console.log("connected to mongodb");
    })
    .catch((err) => {
        console.log("can't connect to mongodb",err);
    })

app.post('/signup', async function(req, res, next){
    try{
        const {username,email,password} = req.body;
        const result = await userSchema.safeParse(req.body);
        if(!result.success){
            return res.status(400).json({msg: "invalid credentials",a:0});
        }
    
        const newUser = await new User({
            username,
            email,
            password :bcrypt.hashSync(password,salt),
        })
        await newUser.save();
    
        return res.json({msg:"signup successful",a:1});
    }
    catch(err){
        console.log("error while signing up",err);
        return res.status(400).json({msg:"invalid credentials",err,a:0});
    }
})

app.post('/login', async function(req, res, next){
    try{
        const {username,email,password} = req.body;
        const result = await userSchema.safeParse(req.body);
        if(!result.success){
            return res.status(400).json({msg: "invalid credentials",a:0});
        }

        const user = await User.findOne({username,email});
        if(!user) return res.status(401).json({msg: "user not found",a:0});

        const passwordVerify = bcrypt.compareSync(password,user.password);

        if(!passwordVerify) return res.status(401).json({msg: "Incorrect password",a:0});

        const token = jwt.sign({username,email},process.env.JWT_SECRET_KEY);
        console.log("token is here:",token);

        return res.json({msg: "login successful",token:token,a:1});
    }
    catch(err){
        console.log("error while login", err);
        return res.status(400).json({msg:"error while login",err,a:0});
    }
} )



app.listen(3000);