const express = require('express');
const mongoose = require('mongoose');
const zod = require('zod');
const {Dsa, User} = require('./db');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const authMiddleware = require('./authMiddleware');
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

        const token = jwt.sign({username,email,id:user._id},process.env.JWT_SECRET_KEY);
        console.log("token is here:",token);

        return res.json({msg: "login successful",token:token,a:1});
    }
    catch(err){
        console.log("error while login", err);
        return res.status(400).json({msg:"error while login",err,a:0});
    }
} )

app.post('/add',authMiddleware, async function(req,res,next){
    try{
        const {title,url,tags,difficulty} = req.body;
        
        //if the user is authenticated add question
        const decodedData = req.user;
        console.log("decoded data:",decodedData);

        const addquestion = await Dsa.create({
            title,
            url,
            tags,
            difficulty,
            revisionCount: 0,
            author: decodedData.id,
        })

        return res.json({msg:"question added successfully",a:1,addquestion});
    }
    catch(err){
        console.log("error while adding question",err);
        return res.json({msg:"error while adding question",a:0,err});
    }
});

app.get('/list',authMiddleware, async function(req,res,next){
    try{
        const decodedData = req.user;

        const list = await Dsa.find({author: decodedData.id}).sort({revisionCount:1});
        if(!list || list.length==0) return res.json({msg: "cant find question list",a:0});

        return res.json({msg:"question list fetched successfully",a:1,list});
    }
    catch(err){
        console.log("error at /list endpoint",err);
        return res.json({msg:"error at /list endpoint",a:0});
    }
})

app.post('/countupdate/:id', authMiddleware, async (req, res) => {
    try{
        const {id} = req.params;
        const updateCount = await Dsa.updateOne(
            {_id:id},
            { $inc: { revisionCount: 1 }
        })
        if (!updateCount) {
            return res.status(404).json({ error: 'Question not found' ,a:0});
        }
        return res.status(200).json({ message: 'RevisionCount updated successfully' ,a:1});
    }
    catch(err){
        console.error('Error updating revision count:', err);
        return res.status(400).json({ msg: 'error while incresing count',a:0 ,error: err });
    }
    
})


app.listen(3000);