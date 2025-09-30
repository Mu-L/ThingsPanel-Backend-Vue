/**
 * 🔒 属性白名单机制测试工具
 * 用于验证新的白名单安全机制是否正常工作
 */

import { propertyExposureManager } from './PropertyExposureManager'
import type { PropertyAccessContext } from './types'

/**
 * 测试属性白名单机制
 */
export async function testPropertyWhitelistMechanism() {

  const testResults: Array<{
    componentType: string
    test: string
    passed: boolean
    details: any
  }> = []

  try {
    // 测试1: 验证白名单属性注册

    const switchControllerWhitelist = propertyExposureManager.getWhitelistedProperties(
      'switch-controller',
      'public',
      { source: 'test' }
    )

    const hasTitle = 'title' in switchControllerWhitelist
    const hasSwitchValue = 'switchValue' in switchControllerWhitelist

    testResults.push({
      componentType: 'switch-controller',
      test: 'whitelist registration',
      passed: hasTitle && hasSwitchValue,
      details: {
        hasTitle,
        hasSwitchValue,
        whitelistCount: Object.keys(switchControllerWhitelist).length,
        properties: Object.keys(switchControllerWhitelist)
      }
    })


    // 🚨 测试1.1: 验证告警状态组件的白名单属性（用户关注的四个属性）

    const alertStatusWhitelist = propertyExposureManager.getWhitelistedProperties(
      'alert-status',
      'public',
      { source: 'test' }
    )

    const hasAlertTitle = 'title' in alertStatusWhitelist
    const hasAlertAmount = 'amount' in alertStatusWhitelist
    const hasAlertDescription = 'description' in alertStatusWhitelist
    const hasAlertLevel = 'alertLevel' in alertStatusWhitelist

    testResults.push({
      componentType: 'alert-status',
      test: 'whitelist registration for four properties',
      passed: hasAlertTitle && hasAlertAmount && hasAlertDescription && hasAlertLevel,
      details: {
        hasTitle: hasAlertTitle,
        hasAmount: hasAlertAmount,
        hasDescription: hasAlertDescription,
        hasAlertLevel: hasAlertLevel,
        whitelistCount: Object.keys(alertStatusWhitelist).length,
        properties: Object.keys(alertStatusWhitelist),
        expectedProperties: ['title', 'amount', 'description', 'alertLevel'],
        allWhitelistedProperties: alertStatusWhitelist
      }
    })


    // 测试2: 验证属性访问控制

    const accessContext: PropertyAccessContext = {
      accessType: 'read',
      timestamp: Date.now(),
      source: 'test'
    }

    // 测试合法属性访问
    const validAccess = propertyExposureManager.getExposedProperty(
      'switch-controller',
      'test-component-id',
      'title',
      'LED控制开关',
      accessContext
    )

    // 测试非法属性访问（不存在的属性）
    const invalidAccess = propertyExposureManager.getExposedProperty(
      'switch-controller',
      'test-component-id',
      'secretProperty',  // 不在白名单中
      'secret value',
      accessContext
    )

    testResults.push({
      componentType: 'switch-controller',
      test: 'access control',
      passed: validAccess.allowed && !invalidAccess.allowed,
      details: {
        validAccessAllowed: validAccess.allowed,
        validAccessValue: validAccess.value,
        invalidAccessAllowed: invalidAccess.allowed,
        invalidAccessReason: invalidAccess.reason
      }
    })


    // 🚨 测试2.1: 验证告警状态组件的属性访问控制

    // 测试告警状态组件的合法属性访问
    const alertTitleAccess = propertyExposureManager.getExposedProperty(
      'alert-status',
      'test-alert-component',
      'title',
      '高温告警',
      accessContext
    )

    const alertAmountAccess = propertyExposureManager.getExposedProperty(
      'alert-status',
      'test-alert-component',
      'amount',
      1000,
      accessContext
    )

    const alertDescriptionAccess = propertyExposureManager.getExposedProperty(
      'alert-status',
      'test-alert-component',
      'description',
      '系统温度超出正常范围',
      accessContext
    )

    const alertLevelAccess = propertyExposureManager.getExposedProperty(
      'alert-status',
      'test-alert-component',
      'alertLevel',
      'warning',
      accessContext
    )

    // 测试告警状态组件的非法属性访问
    const alertInvalidAccess = propertyExposureManager.getExposedProperty(
      'alert-status',
      'test-alert-component',
      'privateConfig',  // 不在白名单中
      'private data',
      accessContext
    )

    const alertAccessPassed = alertTitleAccess.allowed &&
                             alertAmountAccess.allowed &&
                             alertDescriptionAccess.allowed &&
                             alertLevelAccess.allowed &&
                             !alertInvalidAccess.allowed

    testResults.push({
      componentType: 'alert-status',
      test: 'property access control',
      passed: alertAccessPassed,
      details: {
        titleAccess: { allowed: alertTitleAccess.allowed, value: alertTitleAccess.value },
        amountAccess: { allowed: alertAmountAccess.allowed, value: alertAmountAccess.value },
        descriptionAccess: { allowed: alertDescriptionAccess.allowed, value: alertDescriptionAccess.value },
        alertLevelAccess: { allowed: alertLevelAccess.allowed, value: alertLevelAccess.value },
        invalidAccess: { allowed: alertInvalidAccess.allowed, reason: alertInvalidAccess.reason }
      }
    })


    // 测试3: 验证属性级别控制

    // 测试 public 级别属性
    const publicProperties = propertyExposureManager.getWhitelistedProperties(
      'switch-controller',
      'public',
      { source: 'test' }
    )

    // 测试 protected 级别属性
    const protectedProperties = propertyExposureManager.getWhitelistedProperties(
      'switch-controller',
      'protected',
      { source: 'test' }
    )

    const hasPublicProperties = Object.keys(publicProperties).length > 0
    const hasProtectedProperties = Object.keys(protectedProperties).length > 0

    testResults.push({
      componentType: 'switch-controller',
      test: 'access level control',
      passed: hasPublicProperties && hasProtectedProperties,
      details: {
        publicCount: Object.keys(publicProperties).length,
        protectedCount: Object.keys(protectedProperties).length,
        publicProperties: Object.keys(publicProperties),
        protectedProperties: Object.keys(protectedProperties)
      }
    })


    // 生成测试报告
    const passedTests = testResults.filter(r => r.passed).length
    const totalTests = testResults.length


    testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌'
      if (!result.passed) {
      }
    })

    // 返回测试结果
    return {
      success: passedTests === totalTests,
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      results: testResults
    }

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      totalTests: 0,
      passedTests: 0,
      failedTests: 1,
      results: testResults
    }
  }
}

/**
 * 在浏览器控制台中运行测试
 * 使用方法: 在浏览器控制台输入 window.testPropertyWhitelist()
 */
export function setupBrowserTest() {
  if (typeof window !== 'undefined') {
    ;(window as any).testPropertyWhitelist = testPropertyWhitelistMechanism
  }
}

// 自动设置浏览器测试（如果在浏览器环境中）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setupBrowserTest()
}