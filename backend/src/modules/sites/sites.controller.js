const sitesService = require('./sites.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { sites, total, page, limit } = await sitesService.getAll(req.query);
    return sendPaginated(res, sites, total, page, limit, 'Sites fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const site = await sitesService.getById(req.params.id);
    return sendSuccess(res, site);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const getByProject = async (req, res, next) => {
  try {
    const sites = await sitesService.getByProject(req.params.projectId);
    return sendSuccess(res, sites);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const site = await sitesService.create(req.body);
    return sendSuccess(res, site, 'Site created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const site = await sitesService.update(req.params.id, req.body);
    return sendSuccess(res, site, 'Site updated');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await sitesService.remove(req.params.id);
    return sendSuccess(res, null, 'Site deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, getByProject, create, update, remove };
