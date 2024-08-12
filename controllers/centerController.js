const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const response = require("../utils/response");
const getLoggedInUser = require("../utils/getLoggedInUser");

class CenterController {
  async centersGet(req, res) {
    try {
      const token = req.cookies.token;

      if (token) {
        const loggedInUser = await prisma.user.findFirst({
          where: {
            token: parseInt(token),
          },
        });

        const centers = await prisma.center.findMany({
          // where: {
          //   status: 1,
          // },
        });

        const { password, ...adminDataWithoutPassword } = loggedInUser;

        response.success(res, "Centers fetched!", {
          ...adminDataWithoutPassword,
          centers,
        });
      } else {
        // for some reason if we remove status code from response logout thunk in frontend gets triggered multiple times
        res
          .status(401)
          .json({ message: "user not already logged in.", status: "failure" });
      }
    } catch (error) {
      console.log("error while getting centers ", error);
    }
  }

  async centerCreatePost(req, res) {
    try {
      const {
        centerName,
        ownerName,
        mobileNumber,
        emailId,
        location,
        branchId,
        userType,
        password,
      } = req.body;

      const loggedInUser = await getLoggedInUser(req, res);
      const userIp = req.socket.remoteAddress;

      const alreadyRegistered = await prisma.center.findFirst({
        where: {
          OR: [{ emailId }],
        },
      });

      if (loggedInUser) {
        if (alreadyRegistered) {
          if (
            alreadyRegistered.emailId === emailId ||
            alreadyRegistered.mobileNumber === mobileNumber
          ) {
            response.error(
              res,
              "User already registered with this Email Or Mobile Number.",
              alreadyRegistered
            );
          }
        } else {
          const newCenter = await prisma.center.create({
            data: {
              centerName,
              ownerName,
              mobileNumber,
              emailId,
              location,
              branchId,
              userType: parseInt(userType),
              password,
              status: 1,
              addedBy: loggedInUser.id,
            },
          });

          const newUser = await prisma.user.create({
            data: {
              username: centerName,
              email: emailId,
              password: password,
              roleId: parseInt(userType),
              userIp,
            },
          });

          response.success(res, "Center registered successfully!", newCenter);
        }
      }
    } catch (error) {
      console.log("error while center registration ->", error);
    }
  }

  async centerUpdatePatch(req, res) {
    try {
      const {
        centerName,
        ownerName,
        mobileNumber,
        emailId,
        location,
        branchId,
        userType,
        password,
        status,
      } = req.body;

      const { centerId } = req.params;

      // finding user from id
      const centerFound = await prisma.center.findFirst({
        where: {
          id: parseInt(centerId),
        },
      });

      const alreadyRegistered = await prisma.center.findFirst({
        where: {
          OR: [{ emailId }],
        },
      });

      if (centerFound) {
        if (status === 0 || status === 1) {
          const updatedCenter = await prisma.center.update({
            where: {
              id: parseInt(centerId),
            },

            data: {
              status,
            },
          });

          // update the status of corresponding user so that he can't log in
          const userToBeUpdated = await prisma.user.findFirst({
            where: {
              email: updatedCenter.emailId,
            },
          });

          const updatedUser = await prisma.user.update({
            where: {
              id: userToBeUpdated.id,
            },
            data: {
              status,
            },
          });

          response.success(res, "Center removed successfully!", {
            updatedCenter,
          });
        } else {
          if (
            alreadyRegistered &&
            alreadyRegistered.id !== parseInt(centerFound.id)
          ) {
            if (
              alreadyRegistered.emailId === emailId ||
              alreadyRegistered.mobileNumber === mobileNumber
            ) {
              response.error(
                res,
                "Center already registered with this Email Or Mobile Number.",
                alreadyRegistered
              );
            }
          } else {
            // update the details in user table as well
            const userToBeUpdated = await prisma.user.findFirst({
              where: {
                email: centerFound.emailId,
              },
            });

            const updatedUser = await prisma.user.update({
              where: {
                id: userToBeUpdated.id,
              },
              data: {
                username: centerName,
                email: emailId,
                password,
              },
            });

            const updatedCenter = await prisma.center.update({
              where: {
                id: parseInt(centerId),
              },

              data: {
                centerName,
                ownerName,
                mobileNumber,
                emailId,
                location,
                branchId,
                userType: parseInt(userType),
                password,
              },
            });

            response.success(res, "Center updated successfully!", {
              updatedCenter,
            });
          }
        }
      } else {
        response.error(res, "Center not found!");
      }
    } catch (error) {
      console.log("error while updating center controller", error);
    }
  }

  async centerRemoveDelete(req, res) {
    try {
      const { centerId } = req.params;

      // finding user from userId
      const centerFound = await prisma.center.findFirst({
        where: {
          id: parseInt(centerId),
        },
      });

      if (centerFound) {
        const deletedCenter = await prisma.center.delete({
          where: {
            id: parseInt(centerId),
          },
        });

        response.success(res, "Center deleted successfully!", {
          deletedCenter,
        });
      } else {
        response.error(res, "Center does not exist! ");
      }
    } catch (error) {
      console.log("error while deleting center ", error);
    }
  }
}

module.exports = new CenterController();
