export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U> ? Mutable<U>[] : Mutable<T[P]>
}

export type PrimitiveType
  = | string
    | number
    | boolean
    | null
    | undefined
    | symbol
    | bigint

// 常见类型字符串
export type CommonType
  = | 'string'
    | 'number'
    | 'bigint'
    | 'boolean'
    | 'symbol'
    | 'undefined'
    | 'function'
    | 'null'
    | 'array'
    | 'date'
    | 'regexp'
    | 'map'
    | 'set'
    | 'promise'
    | 'error'
    | 'object'

/**
 * 获取数据的详细类型
 * @param value 要检查的值
 * @returns 类型字符串
 */
export function getType(value: any): CommonType
/**
 * 获取数据的详细类型
 * @param value 要检查的值
 * @param specific 是否返回具体的构造函数名称
 * @returns 类型字符串或构造函数名称
 */
export function getType(value: any, specific: false): CommonType
/**
 * 获取数据的详细类型
 * @param value 要检查的值
 * @param specific 是否返回具体的构造函数名称
 * @returns 类型字符串或构造函数名称
 */
export function getType(value: any, specific: true): CommonType | (string & {})
export function getType(value: any, specific: boolean = false) {
  if (value === null)
    return 'null'
  if (value === undefined)
    return 'undefined'

  const type = typeof value

  if (type === 'object') {
    if (Array.isArray(value))
      return 'array'
    if (value instanceof Date)
      return 'date'
    if (value instanceof RegExp)
      return 'regexp'
    if (value instanceof Map)
      return 'map'
    if (value instanceof Set)
      return 'set'
    if (value instanceof Promise)
      return 'promise'
    if (value instanceof Error)
      return 'error'
    if (specific && value.constructor && value.constructor.name !== 'Object') {
      return value.constructor.name.toLowerCase()
    }
    return 'object'
  }

  return type
}

/**
 * 检查值是否为指定类型
 * @param value 要检查的值
 * @param type 期望的类型
 * @returns 是否为指定类型
 */
export function isType(value: any, type: string): boolean {
  return getType(value) === type.toLowerCase()
}

/**
 * 检查值是否为基本类型
 * @param value 要检查的值
 * @returns 是否为基本类型
 */
export function isPrimitive(value: any): boolean {
  const type = getType(value)
  return ['string', 'number', 'boolean', 'null', 'undefined', 'symbol', 'bigint'].includes(type)
}

/**
 * 检查值是否为对象类型（不包括null、数组等）
 * @param value 要检查的值
 * @returns 是否为对象类型
 */
export function isObject(value: any): boolean {
  return getType(value) === 'object'
}

/**
 * 检查值是否为数组
 * @param value 要检查的值
 * @returns 是否为数组
 */
export function isArray(value: any): boolean {
  return getType(value) === 'array'
}

/**
 * 检查值是否为函数
 * @param value 要检查的值
 * @returns 是否为函数
 */
export function isFunction(value: any): boolean {
  return getType(value) === 'function'
}

/**
 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
 * @param value 要检查的值
 * @returns 是否为空
 */
export function isEmpty(value: any): boolean {
  const type = getType(value)

  if (type === 'null' || type === 'undefined')
    return true
  if (type === 'string')
    return value === ''
  if (type === 'array')
    return value.length === 0
  if (type === 'object')
    return Object.keys(value).length === 0

  return false
}
