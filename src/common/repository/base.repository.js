export const find = async ({ model, filter = {}, options = {} }) => {
    return await model.find(filter, null, options);
};

export const findOne = async ({ model, filter = {}, options = {} }) => {
    return await model.findOne(filter, null, options);
};

export const findById = async ({ model, id, options = {} }) => {
    return await model.findById(id, null, options);
};

export const create = async ({ model, data }) => {
    return await model.create(data);
};

export const updateOne = async ({
    model,
    filter = {},
    update,
    options = { new: true },
}) => {
    return await model.findOneAndUpdate(filter, update, options);
};

export const deleteOne = async ({ model, filter = {} }) => {
    return await model.deleteOne(filter);
};

export const findOneAndDelete = async ({ model, filter = {}, options = {} }) => {
    return await model.findOneAndDelete(filter, options);
};

export const countDocuments = async ({ model, filter = {} }) => {
    return await model.countDocuments(filter);
};

export const exists = async ({ model, filter = {} }) => {
    return await model.exists(filter);
};