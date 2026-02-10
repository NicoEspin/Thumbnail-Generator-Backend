import {Request, Response} from "express"
import User from "../models/User.js";
import bcrypt from "bcrypt"

//register controller
export const registerUser = async (req: Request, res: Response) => {

    try{
        const {name, email, password} = req.body;
        const user = await User.findOne({email});
        if (user) {
            return res.status(400).json({message: "User already exists"});
        }
        //encrypt password
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash(password, salt);
       const newUser = new User({name, email, password: hashedPassword});
       await newUser.save();
      
        //setting user data in session
        req.session.isloggedIn = true;
        req.session.userId = newUser._id;
        return res.json({message: "User registered successfully",
            user:{
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });
        
    }catch(error: any){
        console.log(error);
        return res.status(500).json({message: error.message});

    }
};

//Login controller

export const loginUser = async (req: Request, res: Response) => {
    try{
           const { email, password} = req.body;
        const user = await User.findOne({email});
        if (!user) {
            return res.status(400).json({message: "Invalid email or password"});
        }
        //encrypt password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({message: "Invalid email or password"});
        }
      
      
        //setting user data in session
        req.session.isloggedIn = true;
        req.session.userId = user._id;
        return res.json({message: "Login successful",
            user:{
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }catch(error: any){
        console.log(error);
        return res.status(500).json({message: error.message});
    }
}

//Logout controller
export const logoutUser = async (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({message: "Error logging out"});
        }
        return res.json({message: "Logout successful"});
    })
}

//controoller for verifying if user is logged in
export const verifyUser = async (req: Request, res: Response) => {
 try{
    const {userId} = req.session;
    const user = await User.findById(userId).select("-password");
    if(!user){
        return res.status(400).json({message: "Invalid user"});
    }
    return res.json({user});
 }catch(error:any){
    console.log(error);
    res.status(500).json({message: error.message});
 }
}