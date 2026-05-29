const projectsService = require('./projects.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { projects, total, page, limit } = await projectsService.getAll(req.query);
    return sendPaginated(res, projects, total, page, limit, 'Projects fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const project = await projectsService.getById(req.params.id);
    return sendSuccess(res, project);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const project = await projectsService.create(req.body);
    return sendSuccess(res, project, 'Project created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const project = await projectsService.update(req.params.id, req.body);
    return sendSuccess(res, project, 'Project updated');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await projectsService.remove(req.params.id);
    return sendSuccess(res, null, 'Project deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await projectsService.getStats(req.params.id);
    return sendSuccess(res, stats);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, getStats };
