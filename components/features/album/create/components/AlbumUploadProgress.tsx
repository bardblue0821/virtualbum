import { Group, Text, Progress } from '@mantine/core';
import { AlbumCreateProgress } from '@/lib/services/album/create-album-with-images.service';

interface AlbumUploadProgressProps {
  progress: number;
  fileProgress: AlbumCreateProgress[];
}

export default function AlbumUploadProgress({ progress, fileProgress }: AlbumUploadProgressProps) {
  return (
    <div role="status" className="space-y-2">
      <Group justify="space-between" align="center">
        <Text size="sm">アップロード中...</Text>
        <div style={{ minWidth: 220 }}>
          <Progress value={progress} color="teal" animated />
        </div>
      </Group>
      <ul className="text-xs text-gray-600 space-y-1">
        {fileProgress.map((fp, i) => (
          <li key={i}>
            画像{i + 1}: {fp.percent}%{' '}
            {fp.state === 'error' && (
              <span className="text-red-600">(失敗 {fp.error})</span>
            )}
            {fp.state === 'success' && <span className="text-green-600">OK</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
