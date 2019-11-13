const logger = require('logger-sharelatex')
const OError = require('@overleaf/o-error')
const metrics = require('@overleaf/metrics')
const Settings = require('settings-sharelatex')
const { ObjectId } = require('mongodb')
const { Project } = require('../../models/Project')
const { Folder } = require('../../models/Folder')
const ProjectEntityUpdateHandler = require('./ProjectEntityUpdateHandler')
const ProjectDetailsHandler = require('./ProjectDetailsHandler')
const HistoryManager = require('../History/HistoryManager')
const { User } = require('../../models/User')
const fs = require('fs')
const path = require('path')
const { callbackify } = require('util')
const _ = require('underscore')
const AnalyticsManager = require('../Analytics/AnalyticsManager')
const SplitTestHandler = require('../SplitTests/SplitTestHandler')

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const EXAMPLE_PROJECT_SPLITTEST_ID = 'example-project-v2'

async function createBlankProject(ownerId, projectName, attributes = {}) {
  const isImport = attributes && attributes.overleaf
  const project = await _createBlankProject(ownerId, projectName, attributes)
  if (isImport) {
    AnalyticsManager.recordEvent(ownerId, 'project-imported', {
      projectId: project._id,
      attributes,
    })
  } else {
    AnalyticsManager.recordEvent(ownerId, 'project-created', {
      projectId: project._id,
      attributes,
    })
  }
  return project
}

async function createProjectFromSnippet(ownerId, projectName, docLines) {
  const project = await _createBlankProject(ownerId, projectName)
  AnalyticsManager.recordEvent(ownerId, 'project-created', {
    projectId: project._id,
  })
  await _createRootDoc(project, ownerId, docLines)
  return project
}

async function createBasicProject(ownerId, projectName) {
  const project = await _createBlankProject(ownerId, projectName)
  AnalyticsManager.recordEvent(ownerId, 'project-created', {
    projectId: project._id,
  })
  const docLines = await _buildTemplate('mainbasic.tex', ownerId, projectName)
  await _createRootDoc(project, ownerId, docLines)
  return project
}

async function createTemplateProject(ownerId, projectName, template) {
  const project = await _createBlankProject(ownerId, projectName)

  // get template data
  let templateData
  if (template == 'example') {
    templateData = {
      path: 'example/',
      templateFiles: ['main.tex'],
      staticFiles: ['references.bib', 'universe.jpg'],
    }
  } else {
    templateData = Settings.customTemplates[template]
  }

  // create project files
  if (templateData.templateFiles) {
    for (const [index, fileName] of templateData.templateFiles.entries()) {
      const docLines = await _buildTemplate(path.join(templateData.path, fileName), ownerId, projectName)

      if (index === 0)
        await _createRootDoc(project, ownerId, docLines);
      else
        await ProjectEntityUpdateHandler.promises.addDoc(
          project._id,
          project.rootFolder[0]._id,
          fileName,
          docLines,
          ownerId,
        )
    }
  }
  if (templateData.staticFiles) {
    for (const fileName of templateData.staticFiles) {
      await ProjectEntityUpdateHandler.promises.addFile(
        project._id,
        project.rootFolder[0]._id,
        fileName,
        path.resolve(
          __dirname + `/../../../templates/${path.join(templateData.path, fileName)}`
        ),
        null,
        ownerId,
      )
    }
  }


  AnalyticsManager.recordEvent(ownerId, 'project-created', {
    projectId: project._id,
  })

  return project
}

async function _createBlankProject(ownerId, projectName, attributes = {}) {
  metrics.inc('project-creation')
  await ProjectDetailsHandler.promises.validateProjectName(projectName)

  if (!attributes.overleaf) {
    const history = await HistoryManager.promises.initializeProject()
    attributes.overleaf = {
      history: { id: history ? history.overleaf_id : undefined },
    }
  }

  const rootFolder = new Folder({ name: 'rootFolder' })

  attributes.lastUpdatedBy = attributes.owner_ref = new ObjectId(ownerId)
  attributes.name = projectName
  const project = new Project(attributes)

  Object.assign(project, attributes)

  if (Settings.apis.project_history.displayHistoryForNewProjects) {
    project.overleaf.history.display = true
  }
  if (Settings.currentImageName) {
    // avoid clobbering any imageName already set in attributes (e.g. importedImageName)
    if (!project.imageName) {
      project.imageName = Settings.currentImageName
    }
  }
  project.rootFolder[0] = rootFolder
  const user = await User.findById(ownerId, 'ace.spellCheckLanguage')
  project.spellCheckLanguage = user.ace.spellCheckLanguage
  return await project.save()
}

async function _createRootDoc(project, ownerId, docLines) {
  try {
    const { doc } = await ProjectEntityUpdateHandler.promises.addDoc(
      project._id,
      project.rootFolder[0]._id,
      'main.tex',
      docLines,
      ownerId
    )
    await ProjectEntityUpdateHandler.promises.setRootDoc(project._id, doc._id)
  } catch (error) {
    throw OError.tag(error, 'error adding root doc when creating project')
  }
}

async function _buildTemplate(filePath, userId, projectName) {
  const user = await User.findById(userId, 'first_name last_name')

  const templatePath = path.resolve(
    __dirname + `/../../../templates/${filePath}`
  )
  const template = fs.readFileSync(templatePath)
  const data = {
    project_name: projectName,
    user,
    year: new Date().getUTCFullYear(),
    month: MONTH_NAMES[new Date().getUTCMonth()],
  }
  const output = _.template(template.toString())(data)
  return output.split('\n')
}

module.exports = {
  createBlankProject: callbackify(createBlankProject),
  createProjectFromSnippet: callbackify(createProjectFromSnippet),
  createBasicProject: callbackify(createBasicProject),
  createTemplateProject: callbackify(createTemplateProject),
  promises: {
    createBlankProject,
    createProjectFromSnippet,
    createBasicProject,
    createTemplateProject,
  },
}

metrics.timeAsyncMethod(
  module.exports,
  'createBlankProject',
  'mongo.ProjectCreationHandler',
  logger
)
