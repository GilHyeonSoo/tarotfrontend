/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 정적 빌드
  images: {
    unoptimized: true  // 이미지 최적화 비활성화 (정적 빌드용)
  },
  trailingSlash: true,  // URL 끝에 슬래시 추가
};

export default nextConfig;
