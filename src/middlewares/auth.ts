import { Request, Response, NextFunction } from "express";

const protect = async (req:Request, res:Response, next:NextFunction)=>{
    const {isloggedIn, userId} = req.session;
    if (!isloggedIn || !userId) {
        return res.status(401).json({message: "Unauthorized"});
    }
    next();
} 

export default protect