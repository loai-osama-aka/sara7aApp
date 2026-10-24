import { UnauthorizedException } from "../common/index.js";
import { userModel } from "../database/model/user.model.js"

export const autherization = (roles) => {
    return async (req, res, next) => {
        console.log(req.user.sub);

        const user = await userModel.findById(req.user.sub)

        if (!roles.includes(user.role)) {
            throw UnauthorizedException()
        }
        next()

    }

}