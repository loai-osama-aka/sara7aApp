import { env } from "../../config/env.service.js";

export const globalErrorHandling = (err, req, res, next) => {
  let stack;
  env.mood === "dev" ? (stack = err.stack) : null;
  console.log(err.cause, "errorrrrr");

  return res
    .status(err.cause?.status ?? 500)
    .json({ message: err.message ?? "server error", stack });
};

export const ErrorResponse = ({
  status = 400,
  message = "something went wrong",
  extra = undefined,
} = {}) => {
  throw new Error(message, { cause: { status, extra } });
};

export const BadRequestException = ({
  message = "Bad request",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 400, message, extra });
};

export const UnauthorizedException = ({
  message = "Unauthorized",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 401, message, extra });
};

export const ForbiddenException = ({
  message = "Forbidden",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 403, message, extra });
};

export const NotFoundException = ({
  message = "Not found",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 404, message, extra });
};

export const ConflictException = ({
  message = "Conflict",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 409, message, extra });
};

export const UnprocessableEntityException = ({
  message = "Unprocessable entity",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 422, message, extra });
};

export const TooManyRequestsException = ({
  message = "Too many requests",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 429, message, extra });
};

export const InternalServerErrorException = ({
  message = "Internal server error",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 500, message, extra });
};

export const NotImplementedException = ({
  message = "Not implemented",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 501, message, extra });
};

export const BadGatewayException = ({
  message = "Bad gateway",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 502, message, extra });
};

export const ServiceUnavailableException = ({
  message = "Service unavailable",
  extra = undefined,
} = {}) => {
  return ErrorResponse({ status: 503, message, extra });
};
