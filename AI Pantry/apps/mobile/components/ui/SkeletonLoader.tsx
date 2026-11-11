import { useEffect, useRef } from 'react';
import { Animated, View, ViewProps } from 'react-native';

interface SkeletonLoaderProps extends ViewProps {
  className?: string;
}

export function SkeletonLoader({ className = '', style, ...props }: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[{ opacity, backgroundColor: '#e5e7eb' }, style]}
      className={className}
      {...props}
    />
  );
}
