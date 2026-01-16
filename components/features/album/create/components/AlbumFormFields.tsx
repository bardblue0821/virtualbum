import TagInput from '@/components/form/TagInput';

interface AlbumFormFieldsProps {
  title: string;
  setTitle: (value: string) => void;
  placeUrl: string;
  setPlaceUrl: (value: string) => void;
  comment: string;
  setComment: (value: string) => void;
  visibility: 'public' | 'friends';
  setVisibility: (value: 'public' | 'friends') => void;
  albumTags: string[];
  setAlbumTags: (tags: string[]) => void;
  tagCandidates: string[];
  loading: boolean;
  disabled: boolean;
}

export default function AlbumFormFields({
  title,
  setTitle,
  placeUrl,
  setPlaceUrl,
  comment,
  setComment,
  visibility,
  setVisibility,
  albumTags,
  setAlbumTags,
  tagCandidates,
  loading,
  disabled,
}: AlbumFormFieldsProps) {
  return (
    <>
      <div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input-underline"
          disabled={loading || disabled}
          placeholder="なんのアルバム？"
        />
      </div>

      <div>
        <input
          value={placeUrl}
          onChange={e => setPlaceUrl(e.target.value)}
          className="input-underline"
          disabled={loading || disabled}
          placeholder="https://vrchat.com/..."
        />
      </div>

      <div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="input-underline text-sm"
          disabled={loading || disabled}
          maxLength={200}
          rows={3}
          placeholder="どうだった？(200文字まで)"
        />
        <p className="text-xs text-gray-500 text-right">{comment.length}/200</p>
      </div>

      <div>
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={visibility === 'public'}
              onChange={() => setVisibility('public')}
              disabled={loading || disabled}
            />
            <span>公開</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="visibility"
              value="friends"
              checked={visibility === 'friends'}
              onChange={() => setVisibility('friends')}
              disabled={loading || disabled}
            />
            <span>フレンド限定</span>
          </label>
        </div>
        <p className="text-xs text-muted mt-1">
          フレンド限定にすると、ウォッチャーや非フレンドには完全に表示されません。共有・リポストも無効になります。
        </p>
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">タグ（最大5つ）</label>
        <TagInput
          tags={albumTags}
          onChange={setAlbumTags}
          candidates={tagCandidates}
          placeholder="タグを入力（Enterで追加）"
          maxTags={5}
          disabled={loading || disabled}
        />
        <p className="text-xs text-muted mt-1">
          タグは検索で使用されます。日本語・英数字・アンダースコアが使えます。
        </p>
      </div>
    </>
  );
}
