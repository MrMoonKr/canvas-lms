/*
 * Copyright (C) 2025 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import {useScope as createI18nScope} from '@canvas/i18n'
import doFetchApi from '../../../../shared/do-fetch-api-effect'

const I18n = createI18nScope('context_modules_v2')

export interface NewItemType {
  page_id?: string
  name?: string
  type?: string
  id?: string
  title?: string
  display_name?: string
  url?: string
  newTab?: boolean
  graded?: boolean
  position?: number
  indent?: number
  [key: string]: any
}

export interface ModuleItemData {
  type: string
  itemCount: number
  indentation: number
  selectedTabIndex?: number
  textHeaderValue?: string
  externalUrlName?: string
  externalUrlValue?: string
  externalUrlNewTab?: boolean
  selectedItem?: {
    id: string
    name: string
  } | null
  newItemName?: string
}

export const prepareModuleItemData = (
  _moduleId: string,
  itemData: ModuleItemData,
): Record<string, string | number | string[] | undefined | boolean> => {
  const {
    type,
    itemCount,
    indentation,
    textHeaderValue,
    externalUrlName,
    externalUrlValue,
    externalUrlNewTab,
    selectedItem,
    selectedTabIndex,
  } = itemData

  // Base item data that applies to all types
  const result: Record<string, string | number | string[] | undefined | boolean> = {
    'item[type]': type,
    'item[position]': itemCount + 1,
    'item[indent]': indentation,
    quiz_lti: false,
    'content_details[]': 'items',
    type: type,
    new_tab: 0,
    graded: 0,
    _method: 'POST',
  }

  // Add type-specific data
  if (type === 'context_module_sub_header' && textHeaderValue) {
    result['item[id]'] = 'new'
    result['item[title]'] = textHeaderValue
    result['title'] = textHeaderValue
  } else if (type === 'external_url' && externalUrlName && externalUrlValue) {
    result['item[id]'] = 'new'
    result['item[title]'] = externalUrlName
    result['title'] = externalUrlName
    result['item[url]'] = externalUrlValue
    result['url'] = externalUrlValue
    result['item[new_tab]'] = externalUrlNewTab ? '1' : '0'
    result['new_tab'] = externalUrlNewTab ? 1 : 0
  } else if (selectedItem && selectedTabIndex === 0) {
    // Using an existing item
    result['item[id]'] = selectedItem.id
    result['item[title]'] = selectedItem.name
    result['title'] = selectedItem.name
  }

  return result
}

export const buildFormData = (
  type: string,
  newItemName: string,
  selectedAssignmentGroup: string,
  NEW_QUIZZES_BY_DEFAULT: boolean,
  DEFAULT_POST_TO_SIS: boolean,
) => {
  const formData = new FormData()

  formData.append('item[id]', 'new')
  formData.append('item[title]', newItemName)

  if (type === 'assignment') {
    formData.append('assignment[title]', newItemName)
    formData.append('assignment[post_to_sis]', String(DEFAULT_POST_TO_SIS ?? false))
  } else if (type === 'quiz') {
    const quizType = NEW_QUIZZES_BY_DEFAULT ? 'assignment' : 'quiz'
    if (quizType === 'assignment') {
      formData.append('assignment[title]', newItemName || I18n.t('New Quiz'))
      formData.append('quiz_lti', '1')
    } else {
      formData.append('quiz[title]', newItemName || I18n.t('New Quiz'))
    }
    formData.append('quiz[assignment_group_id]', selectedAssignmentGroup)
  } else if (type === 'discussion') {
    formData.append('title', newItemName || I18n.t('New Discussion'))
  } else if (type === 'page') {
    formData.append('wiki_page[title]', newItemName || I18n.t('New Page'))
  }

  return formData
}

export const createNewItemApiPath = (
  type: string,
  courseId: string,
  NEW_QUIZZES_BY_DEFAULT: boolean,
) => {
  switch (type) {
    case 'assignment':
      return `/courses/${courseId}/assignments`
    case 'quiz':
      return NEW_QUIZZES_BY_DEFAULT
        ? `/courses/${courseId}/assignments`
        : `/courses/${courseId}/quizzes`
    case 'discussion':
      return `/api/v1/courses/${courseId}/discussion_topics`
    case 'page':
      return `/api/v1/courses/${courseId}/pages`
    default:
      console.error('Unsupported item type for creation:', type)
      return ''
  }
}

export const createNewItem = async (
  type: string,
  courseId: string,
  newItemName: string,
  selectedAssignmentGroup: string,
  NEW_QUIZZES_BY_DEFAULT: boolean,
  DEFAULT_POST_TO_SIS: boolean,
): Promise<NewItemType | null> => {
  try {
    // Create the item
    const response = await doFetchApi({
      path: createNewItemApiPath(type, courseId, NEW_QUIZZES_BY_DEFAULT),
      method: 'POST',
      body: buildFormData(
        type,
        newItemName,
        selectedAssignmentGroup,
        NEW_QUIZZES_BY_DEFAULT,
        DEFAULT_POST_TO_SIS,
      ),
    })

    // The response from doFetchApi already contains the parsed JSON data
    const responseData = response.json as Record<string, any>

    // Handle different response structures based on item type
    if (type === 'assignment' && responseData?.assignment) {
      return responseData.assignment as NewItemType
    } else if (type === 'quiz' && responseData?.quiz) {
      return responseData.quiz as NewItemType
    } else if (type === 'discussion') {
      return responseData as NewItemType
    } else if (type === 'page') {
      return responseData as NewItemType
    }

    return responseData as NewItemType
  } catch (error) {
    console.error(`Error creating new ${type}:`, error)
    return null
  }
}

export const submitModuleItem = async (
  courseId: string,
  moduleId: string,
  itemData: Record<string, string | number | string[] | undefined | boolean>,
): Promise<Record<string, any> | null> => {
  try {
    // Convert the itemData object to FormData
    const formData = new FormData()

    // Add each key-value pair to the FormData object
    Object.entries(itemData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value))
      }
    })

    // Make the API call to add the item to the module
    const response = await doFetchApi({
      path: `/courses/${courseId}/modules/${moduleId}/items`,
      method: 'POST',
      body: formData,
    })

    return response.json as Record<string, any>
  } catch (error) {
    console.error('Error submitting module item:', error)
    return null
  }
}
