/*
 * Copyright (C) 2017 - present Instructure, Inc.
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
import {lockLabels} from './labels'

const I18n = createI18nScope('blueprint_LockItemFormat')

export function formatLockArray(lockableAttributes) {
  const items = lockableAttributes.map(item => lockLabels[item])

  switch (items.length) {
    case 0:
      return I18n.t('no attributes locked')
    case 1:
      return items[0]
    default:
      return `${items.slice(0, -1).join(', ')} & ${items.slice(-1)[0]}`
  }
}

export function formatLockObject(itemLocks) {
  const items = Object.keys(itemLocks).filter(item => itemLocks[item])
  return formatLockArray(items)
}
