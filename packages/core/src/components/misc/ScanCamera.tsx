import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Vibration, View, Pressable, GestureResponderEvent, Animated } from 'react-native'
import { OrientationType, useOrientationChange } from 'react-native-orientation-locker'
import { Camera, CameraRef, useCameraDevice } from 'react-native-vision-camera'
import { Barcode, TargetBarcodeFormat, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner'
import { QrCodeScanError } from '../../types/error'
import { testIdWithKey } from '../../utils/testable'

const BARCODE_FORMATS: TargetBarcodeFormat[] = ['qr-code']

export interface ScanCameraProps {
  handleCodeScan: (value: string) => Promise<void>
  error?: QrCodeScanError | null
  enableCameraOnError?: boolean
  torchActive?: boolean
}

const styles = StyleSheet.create({
  focusIndicator: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
})

const ScanCamera: React.FC<ScanCameraProps> = ({ handleCodeScan, error, enableCameraOnError, torchActive }) => {
  const [orientation, setOrientation] = useState(OrientationType.PORTRAIT)
  const [cameraActive, setCameraActive] = useState(true)
  const orientationDegrees: { [key: string]: string } = {
    [OrientationType.PORTRAIT]: '0deg',
    [OrientationType['LANDSCAPE-LEFT']]: '270deg',
    [OrientationType['PORTRAIT-UPSIDEDOWN']]: '180deg',
    [OrientationType['LANDSCAPE-RIGHT']]: '90deg',
  }
  const [invalidQrCodes, setInvalidQrCodes] = useState(new Set<string>())
  const hasFiredRef = useRef(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const cameraRef = useRef<CameraRef>(null)
  const focusOpacity = useRef(new Animated.Value(0)).current
  const focusScale = useRef(new Animated.Value(1)).current
  const device = useCameraDevice('back')
  useOrientationChange((orientationType) => {
    setOrientation(orientationType)
  })

  const onCodeScanned = useCallback(
    (codes: Barcode[]) => {
      if (!codes.length) {
        return
      }

      const value = codes[0].rawValue
      if (!value || invalidQrCodes.has(value)) {
        return
      }

      if (error?.data === value) {
        setInvalidQrCodes((prev) => new Set([...prev, value]))
        if (enableCameraOnError) {
          hasFiredRef.current = false
          return setCameraActive(true)
        }
      }

      if (hasFiredRef.current) {
        return
      }
      if (cameraActive) {
        hasFiredRef.current = true
        Vibration.vibrate()
        handleCodeScan(value)
        return setCameraActive(false)
      }
    },
    [invalidQrCodes, error, enableCameraOnError, cameraActive, handleCodeScan]
  )

  const drawFocusTap = async (point: { x: number; y: number }): Promise<void> => {
    // Draw a focus tap indicator on the camera preview
    setFocusPoint(point)

    focusOpacity.setValue(1)
    focusScale.setValue(1.5)

    Animated.parallel([
      Animated.timing(focusOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(focusScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFocusPoint(null)
    })
  }

  const focus = useCallback(
    async (point: { x: number; y: number }) => {
      if (cameraRef.current) {
        const focusPoint = cameraRef.current.createMeteringPoint(point.x, point.y)
        await cameraRef.current.controller?.focusTo(focusPoint, { responsiveness: 'snappy' })
      }
    },
    [cameraRef]
  )

  const handleFocusTap = (e: GestureResponderEvent): void => {
    const { locationX: x, locationY: y } = e.nativeEvent
    const tapPoint = { x, y }
    drawFocusTap(tapPoint)
    focus(tapPoint)
  }

  useEffect(() => {
    if (error?.data && enableCameraOnError) {
      hasFiredRef.current = false
      setCameraActive(true)
    }
  }, [error, enableCameraOnError])

  const codeScanner = useBarcodeScannerOutput({
    barcodeFormats: BARCODE_FORMATS,
    onBarcodeScanned: onCodeScanned,
    onError: () => {},
  })

  return (
    <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: orientationDegrees[orientation] ?? '0deg' }] }]}>
      {device && (
        <>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={cameraActive}
            outputs={[codeScanner]}
            torchMode={torchActive ? 'on' : 'off'}
          />
          <Pressable
            accessible={false}
            testID={testIdWithKey('ScanCameraTapArea')}
            style={StyleSheet.absoluteFill}
            onPressIn={(e) => {
              handleFocusTap(e)
            }}
          />
          {focusPoint && (
            <Animated.View
              testID={testIdWithKey('FocusIndicator')}
              style={[
                styles.focusIndicator,
                {
                  left: focusPoint.x - 40,
                  top: focusPoint.y - 40,
                  opacity: focusOpacity,
                  transform: [{ scale: focusScale }],
                },
              ]}
            />
          )}
        </>
      )}
    </View>
  )
}

export default ScanCamera
