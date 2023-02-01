const jwt = require("jsonwebtoken");
const UserModel = require("../models/Users");
const DocumentModel = require("../models/Documents");
const httpStatus = require("../utils/httpStatus");
const bcrypt = require("bcrypt");
const { JWT_SECRET } = require("../constants/constants");
const uploadFile = require("../functions/uploadFile");
const usersController = {};

usersController.register = async (req, res, next) => {
  try {
    const { phonenumber, password, username } = req.body;

    let user = await UserModel.findOne({
      phonenumber: phonenumber,
    });

    if (user) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Phone number already exists",
      });
    }
    //Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const avatar = 'https://static2.yan.vn/YanNews/2167221/202102/facebook-cap-nhat-avatar-doi-voi-tai-khoan-khong-su-dung-anh-dai-dien-e4abd14d.jpg?fbclid=IwAR2XYE-aMz6OcT9TJ4Itm7FmFCZNdVL9LNFYBQafg_f0LDb0q5G-9c7GbUE'
    const coverImage = 'https://img4.thuthuatphanmem.vn/uploads/2020/05/12/hinh-anh-xam-don-gian_103624444.jpg?fbclid=IwAR0zwZRvXXcrl7mQ2urxkeVh_PwQLGhsvdh_aoXCtO847e_QuV2FwA_0INc'
    
    user = new UserModel({
      phonenumber: phonenumber,
      password: hashedPassword,
      username: username,
      avatar: avatar,
      cover_image: coverImage,
      birthday: ''
    });

    try {
      const savedUser = await user.save();

      // login for User
      // create and assign a token
      const token = jwt.sign(
        {
          username: savedUser.username,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          id: savedUser._id,
        },
        JWT_SECRET
      );
      res.status(httpStatus.CREATED).json({
        data: {
          id: savedUser._id,
          phonenumber: savedUser.phonenumber,
          username: savedUser.username,
          avatar: avatar,
          cover_image: coverImage,
        },
        token: token,
      });
    } catch (e) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: e.message,
      });
    }
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};
usersController.login = async (req, res, next) => {
  try {
    const { phonenumber, password } = req.body;
    const user = await UserModel.findOne({
      phonenumber: phonenumber,
    });
    if (!user) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Username or password incorrect",
      });
    }

    // password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Username or password incorrect",
      });
    }

    // login success

    // create and assign a token
    const token = jwt.sign(
      {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        id: user._id,
      },
      JWT_SECRET
    );
    delete user["password"];
    return res.status(httpStatus.OK).json({
      data: {
        id: user._id,
        phonenumber: user.phonenumber,
        username: user.username,
      },
      token: token,
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};
usersController.edit = async (req, res, next) => {
  try {
    let userId = req.userId;
    let user;

    const dataUserUpdate = {};
    // const listPros = [
      "username",
      "gender",
      "birthday",
      "description",
      "address",
      "city",
      "country",
      "avatar",
      "cover_image",
    // ];

    user = await UserModel.findOneAndUpdate({ _id: userId }, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Can not find user" });
    }
    user = await UserModel.findById(userId)
      .select(
        "phonenumber username gender birthday avatar cover_image blocked_inbox blocked_diary description city country "
      )
    return res.status(httpStatus.OK).json({
      data: user,
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};
usersController.changePassword = async (req, res, next) => {
  try {
    let userId = req.userId;
    let user = await UserModel.findById(userId);
    if (user == null) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "UNAUTHORIZED",
      });
    }
    const { currentPassword, newPassword } = req.body;
    // password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Current password incorrect",
        code: "CURRENT_PASSWORD_INCORRECT",
      });
    }

    //Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user = await UserModel.findOneAndUpdate(
      { _id: userId },
      {
        password: hashedNewPassword,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Can not find user" });
    }

    // create and assign a token
    const token = jwt.sign(
      {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        id: user._id,
      },
      JWT_SECRET
    );
    user = await UserModel.findById(userId)
      .select(
        "phonenumber username gender birthday avatar cover_image blocked_inbox blocked_diary description city country "
      )
      // .populate("avatar")
      // .populate("cover_image");
    return res.status(httpStatus.OK).json({
      data: user,
      token: token,
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};
usersController.show = async (req, res, next) => {
  try {
    let userId = null;
    if (req.params.id) {
      userId = req.params.id;
    } else {
      userId = req.userId;
    }

    let user = await UserModel.findById(userId)
      .select(
        "phonenumber username gender birthday avatar cover_image blocked_inbox blocked_diary description city country "
      )
      // .populate("avatar")
      // .populate("cover_image");
    if (user == null) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Can not find user" });
    }

    return res.status(httpStatus.OK).json({
      data: user,
    });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

usersController.showByPhone = async (req, res, next) => {
  try {
    let phonenumber = req.params.phonenumber;

    let user = await UserModel.findOne({ phonenumber: phonenumber })
      // .populate("avatar")
      // .populate("cover_image");
    if (user == null) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "Can not find user" });
    }

    return res.status(httpStatus.OK).json({
      data: user,
    });
  } catch (error) {
    return res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

usersController.setBlock = async (req, res, next) => {
  try {
    let targetId = req.body.user_id;
    if (targetId == req.userId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Không thể tự chặn bản thân",
      });
    }
    let type = req.body.type;
    let user = await UserModel.findById(req.userId);
    blocked = [];
    if (user.hasOwnProperty("blocked")) {
      blocked = user.blocked_inbox;
    }

    if (type) {
      if (blocked.indexOf(targetId) === -1) {
        blocked.push(targetId);
      }
    } else {
      const index = blocked.indexOf(targetId);
      if (index > -1) {
        blocked.splice(index, 1);
      }
    }

    user.blocked_inbox = blocked;
    user.save();

    res.status(200).json({
      code: 200,
      message: "Thao tác thành công",
      data: user,
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};
usersController.setBlockDiary = async (req, res, next) => {
  try {
    let targetId = req.body.user_id;
    if (targetId == req.userId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Không thể tự chặn bản thân",
      });
    }
    let type = req.body.type;
    let user = await UserModel.findById(req.userId);
    blocked = [];
    if (user.hasOwnProperty("blocked")) {
      blocked = user.blocked_diary;
    }

    if (type) {
      if (blocked.indexOf(targetId) === -1) {
        blocked.push(targetId);
      }
    } else {
      const index = blocked.indexOf(targetId);
      if (index > -1) {
        blocked.splice(index, 1);
      }
    }

    user.blocked_diary = blocked;
    user.save();

    res.status(200).json({
      code: 200,
      message: "Thao tác thành công",
      data: user,
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};
usersController.searchUser = async (req, res, next) => {
  try {
    let searchKey = new RegExp(req.body.keyword, "i");
    let result = await UserModel.find({ phonenumber: searchKey })
      .limit(10)
      // .populate("avatar")
      // .populate("cover_image")
      .exec();

    res.status(200).json({
      code: 200,
      message: "Tìm kiếm thành công",
      data: result,
    });
  } catch (e) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: e.message,
    });
  }
};

module.exports = usersController;
