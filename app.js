// 전역 변수
let map;
let markers = [];
let userLocation = null;
let searchLocation = null; // 검색에 사용할 위치
let locationMode = 'map'; // 기본값을 'map'으로 변경
let locationMarker = null; // 위치 표시 마커
let locationInfowindow = null; // 위치 정보창
let selectedPreferences = {
    foodType: null,
    foodForm: null,
    distance: null
};

// 모바일 기기 감지
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 토스트 알림 표시
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

// 도착 예정 시간 계산 (걸어서 80m/분 기준)
function calculateArrivalTime(distanceInMeters) {
    const walkingSpeedPerMinute = 80; // 80m/분 (평균 걸음 속도)
    const minutes = Math.ceil(distanceInMeters / walkingSpeedPerMinute);
    
    if (minutes <= 1) {
        return '약 1분';
    } else if (minutes < 60) {
        return `약 ${minutes}분`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `약 ${hours}시간`;
        } else {
            return `약 ${hours}시간 ${remainingMinutes}분`;
        }
    }
}

// 즐겨찾기 관리
const FavoritesManager = {
    // 즐겨찾기 가져오기
    getFavorites() {
        const favorites = localStorage.getItem('favorites');
        return favorites ? JSON.parse(favorites) : [];
    },
    
    // 즐겨찾기 저장
    saveFavorites(favorites) {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    },
    
    // 즐겨찾기 추가
    addFavorite(place) {
        const favorites = this.getFavorites();
        const exists = favorites.some(fav => fav.id === place.id);
        
        if (!exists) {
            favorites.push(place);
            this.saveFavorites(favorites);
            showToast(`${place.place_name}을(를) 즐겨찾기에 추가했습니다!`, 'success');
            return true;
        }
        return false;
    },
    
    // 즐겨찾기 제거
    removeFavorite(placeId) {
        const favorites = this.getFavorites();
        const filtered = favorites.filter(fav => fav.id !== placeId);
        this.saveFavorites(filtered);
        showToast('즐겨찾기에서 제거했습니다.', 'info');
    },
    
    // 즐겨찾기 여부 확인
    isFavorite(placeId) {
        const favorites = this.getFavorites();
        return favorites.some(fav => fav.id === placeId);
    }
};

// 음식 카테고리 매핑 (대폭 확장)
const categoryMapping = {
    '한식': ['한식', '고기집', '삼겹살', '갈비', '찌개', '백반', '김치찌개', '된장찌개', '순두부', 
            '불고기', '제육', '쌈밥', '보쌈', '족발', '닭갈비', '감자탕', '해장국', '설렁탕', 
            '곰탕', '갈비탕', '삼계탕', '국밥', '순대', '비빔밥', '돌솥밥', '한정식', '정식',
            '생선구이', '조개찜', '아구찜', '해물탕', '매운탕', '추어탕', '육회', '육사시미',
            '전골', '부대찌개', '김치', '두부', '청국장', '콩나물', '떡볶이', '순대', '어묵'],
    '중식': ['중식', '중국집', '중국요리', '짜장면', '짬뽕', '탕수육', '마라탕', '양장피', '깐풍기',
            '볶음밥', '군만두', '물만두', '찐만두', '고추잡채', '유산슬', '팔보채', '동파육',
            '마파두부', '라조기', '깐쇼새우', '유린기', '난자완스', '샤브샤브', '훠궈',
            '마라샹궈', '꿔바로우', '춘권', '샤오룽바오', '딤섬', '중화요리'],
    '일식': ['일식', '돈까스', '회', '초밥', '라멘', '우동', '소바', '일본요리', '스시', '사시미',
            '규동', '덮밥', '오코노미야키', '타코야끼', '야키소바', '텐동', '가츠동', '오야코동',
            '카레', '카레라이스', '일본카레', '카츠카레', '치킨카레', '해물카레', '카레우동',
            '돈부리', '텐푸라', '야끼니꾸', '사케동', '이크라동', '장어덮밥', '연어덮밥',
            '치라시', '모듬초밥', '모듬회', '쯔케멘', '나베', '샤부샤부', '스키야끼', '야키토리',
            '카츠', '가라아게', '에비후라이', '이자카야', '토리카츠', '돈카츠', '히레카츠', '로스카츠'],
    '양식': ['양식', '이탈리안', '스테이크', '햄버거', '파스타', '피자', '레스토랑', '스파게티',
            '리조또', '알리오올리오', '까르보나라', '봉골레', '토마토파스타', '크림파스타',
            '오일파스타', '로제파스타', '라자냐', '뇨끼', '바게트', '샌드위치', '팬케이크',
            '브런치', '샐러드', '그라탕', '스튜', '오믈렛', '에그베네딕트', '그릴', '바비큐',
            '립', '양갈비', '폭립', '커틀릿', '치킨스테이크', '함박스테이크', '안심', '등심',
            '치즈버거', '베이컨버거', '수제버거', '감자튀김', '온니링', '치킨텐더'],
    '동남아': ['태국음식', '베트남음식', '쌀국수', '팟타이', '분짜', '월남쌈', '동남아', '똠얌꿍',
              '카오팟', '분보', '반미', '고이꾸온', '반쎄오', '퍼', '푸팟퐁커리', '쏨땀',
              '팟카파오', '카오만까이', '그린커리', '레드커리', '라프', '나시고랭', '미고랭',
              '사테', '렌당', '가도가도', '인도네시아', '말레이시아', '캄보디아', '라오스',
              '싱가포르', '칠리크랩', '락사', '해남치킨라이스']
};

// 음식 형태 키워드 매핑 (대폭 확장)
const foodFormKeywords = {
    '밥': ['덮밥', '비빔밥', '볶음밥', '쌈밥', '정식', '백반', '한정식', '고기', '삼겹살', '갈비', 
          '제육', '불고기', '김치찌개', '된장찌개', '순두부', '돈까스', '카레', '카레라이스', 
          '카츠카레', '치킨카레', '해물카레', '일본카레', '초밥', '회덮밥', '규동', '오므라이스', 
          '리조또', '오야코동', '텐동', '가츠동', '사케동', '장어덮밥', '연어덮밥', '치라시', 
          '육회', '알밥', '명란', '성게', '보쌈', '족발', '찜', '탕', '전골', '국밥', '해장국', 
          '설렁탕', '곰탕', '갈비탕', '추어탕', '순대국', '뼈해장국', '감자탕', '부대찌개', 
          '돌솥', '쌀', '밥상', '한식', '찌개', '조림', '구이', '회', '사시미', '스시', '중식', 
          '탕수육', '중화요리', '만두', '짬뽕밥', '카오팟', '나시고랭', '해남치킨라이스', 
          '분짜', '반미', '치킨', '스테이크', '함박', '미트볼', '돈부리'],
    '빵': ['베이커리', '샌드위치', '토스트', '햄버거', '빵', '파니니', '베이글', '크루아상', 
          '핫도그', '브런치', '버거', '치즈버거', '수제버거', '베이컨', '바게트', '시나몬롤',
          '마늘빵', '페스츄리', '도넛', '머핀', '스콘', '프레즐', '와플', '팬케이크', '토르티야',
          '브리오슈', '치아바타', '포카치아', '빵집', '제과', '케이크', '타르트', '파이',
          '번', '롤', '잠봉뵈르', '크로크무슈', '퀴시', '피타', '나', '로티'],
    '면': ['국수', '라면', '우동', '소바', '파스타', '짜장', '짬뽕', '냉면', '칼국수', '쌀국수',
          '스파게티', '라멘', '쫄면', '비빔국수', '잔치국수', '막국수', '수제비', '팟타이',
          '볶음면', '탕면', '간짜장', '간짬뽕', '유니짜장', '삼선짬뽕', '해물짬뽕', '짜장면',
          '물냉면', '비빔냉면', '메밀국수', '온면', '멸치국수', '쯔케멘', '라멘', '돈코츠',
          '미소라멘', '쇼유라멘', '시오라멘', '차슈멘', '탄탄면', '짬짜면', '군만두', '물만두',
          '알리오올리오', '까르보나라', '봉골레', '토마토파스타', '크림파스타', '로제파스타',
          '오일파스타', '페스토', '라자냐', '뇨끼', '페투치네', '링귀네', '펜네', '리가토니',
          '스파게티니', '엔젤헤어', '쌀국수', '퍼', '분짜', '반미', '월남쌈', '미고랭', '락사',
          '팟씨이우', '패드', '볶음국수', '야끼소바', '야끼우동', '나폴리탄', '푸팟퐁커리면']
};

// 대표 메뉴 추론 키워드 (대폭 확장)
const menuKeywords = {
    '한식': ['삼겹살', '김치찌개', '된장찌개', '불고기', '갈비', '비빔밥', '제육볶음', '순두부찌개',
            '보쌈', '족발', '닭갈비', '감자탕', '부대찌개', '설렁탕', '곰탕', '육개장', '삼계탕',
            '갈비탕', '해장국', '순대국', '국밥', '백반', '정식', '한정식', '돌솥밥', '쌈밥',
            '전골', '찜닭', '아구찜', '해물탕', '매운탕', '추어탕', '청국장', '콩나물국밥'],
    '중식': ['짜장면', '짬뽕', '탕수육', '마라탕', '양장피', '깐풍기', '볶음밥', '군만두', '물만두',
            '유산슬', '팔보채', '라조기', '깐쇼새우', '유린기', '마파두부', '동파육', '짬짜면',
            '삼선짬뽕', '간짜장', '쟁반짜장', '해물볶음밥', '난자완스', '샤브샤브', '훠궈'],
    '일식': ['초밥', '라멘', '돈까스', '우동', '회', '소바', '규동', '텐동', '사시미', '스시',
            '오코노미야키', '타코야끼', '야키소바', '가츠동', '오야코동', '카레', '카레라이스', 
            '일본카레', '카츠카레', '치킨카레', '해물카레', '텐푸라', '사케동', '장어덮밥', 
            '연어덮밥', '치라시', '쯔케멘', '돈코츠라멘', '토리카츠', '히레카츠', '로스카츠'],
    '양식': ['파스타', '피자', '스테이크', '리조또', '햄버거', '샐러드', '그라탕', '까르보나라',
            '알리오올리오', '봉골레', '로제파스타', '크림파스타', '토마토파스타', '라자냐',
            '등심', '안심', '티본', '립아이', '함박스테이크', '수제버거', '치즈버거', '베이컨버거',
            '샌드위치', '브런치', '팬케이크', '오믈렛', '에그베네딕트', '바비큐립', '폭립'],
    '동남아': ['쌀국수', '팟타이', '분짜', '월남쌈', '똠얌꿍', '카오팟', '분보', '반미', '고이꾸온',
              '반쎄오', '퍼', '푸팟퐁커리', '쏨땀', '팟카파오', '카오만까이', '그린커리', '레드커리',
              '나시고랭', '미고랭', '사테', '렌당', '락사', '칠리크랩', '해남치킨라이스']
};

// 페이지 로드 시 초기화
function initApp() {
    console.log('앱 초기화 시작');
    
    // kakao 객체 확인
    if (typeof kakao === 'undefined') {
        console.error('카카오맵 API가 로드되지 않았습니다!');
        setTimeout(initApp, 100); // 100ms 후 재시도
        return;
    }
    
    console.log('카카오맵 API 확인 완료');
    
    // 모바일 기기 확인 및 현재 위치 버튼 활성화
    const currentLocBtn = document.getElementById('useCurrentLocation');
    const mapLocBtn = document.getElementById('useMapLocation');
    const searchLocationInput = document.getElementById('searchLocationInput');
    const locationHelp = document.getElementById('locationHelp');
    
    if (isMobileDevice()) {
        console.log('모바일 기기 감지됨');
        currentLocBtn.disabled = false;
        currentLocBtn.textContent = '📍 현재 위치';
        currentLocBtn.classList.add('active');
        mapLocBtn.classList.remove('active');
        searchLocationInput.style.display = 'none';
        locationHelp.textContent = '현재 위치를 가져오는 중...';
        locationMode = 'current';
    } else {
        console.log('PC 감지됨 - 지도 검색 모드');
        // PC는 기본값 그대로 (지도 검색 모드, 현재 위치 버튼 비활성화)
        // 기본 위치를 서울 시청으로 설정
        const defaultLocation = new kakao.maps.LatLng(37.5665, 126.9780);
        searchLocation = defaultLocation;
    }
    
    initMap();
    setupEventListeners();
    console.log('초기화 완료');
}

// DOM과 스크립트 로드 완료 후 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// 지도 초기화
function initMap() {
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청 기본 위치
        level: 5
    };
    
    map = new kakao.maps.Map(container, options);
    
    // 지도 클릭 이벤트 등록
    kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
        if (locationMode === 'map') {
            const latlng = mouseEvent.latLng;
            setSearchLocation(latlng, '선택한 위치');
        }
    });
    
    // 사용자 위치 가져오기 (모바일만)
    if (isMobileDevice()) {
        getUserLocation();
    } else {
        // PC는 기본 위치(서울 시청) 표시
        const defaultLocation = new kakao.maps.LatLng(37.5665, 126.9780);
        setSearchLocation(defaultLocation, '서울 시청 (기본 위치)');
        showStatus('주소를 검색하거나 지도를 클릭해서 위치를 선택하세요!', 'info');
    }
}

// 사용자 위치 가져오기 (모바일 전용)
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                userLocation = new kakao.maps.LatLng(lat, lon);
                searchLocation = userLocation; // 기본적으로 현재 위치로 설정
                
                // 지도 중심을 사용자 위치로 이동
                map.setCenter(userLocation);
                
                // 사용자 위치 마커 표시
                setSearchLocation(userLocation, '현재 위치');
                
                showStatus('위치를 확인했습니다! 선호하는 조건을 선택해주세요.', 'success');
            },
            function(error) {
                console.error('위치 가져오기 실패:', error);
                showStatus('위치 정보를 가져올 수 없습니다. 주소를 검색하거나 지도를 클릭해주세요.', 'info');
                userLocation = new kakao.maps.LatLng(37.5665, 126.9780);
                searchLocation = userLocation;
                setSearchLocation(userLocation, '서울 시청 (기본 위치)');
            }
        );
    } else {
        showStatus('브라우저가 위치 서비스를 지원하지 않습니다.', 'error');
        userLocation = new kakao.maps.LatLng(37.5665, 126.9780);
        searchLocation = userLocation;
        setSearchLocation(userLocation, '서울 시청 (기본 위치)');
    }
}

// 주소 검색 함수
function searchAddress(keyword) {
    const geocoder = new kakao.maps.services.Geocoder();
    
    showStatus('주소를 검색하는 중...', 'info');
    
    geocoder.addressSearch(keyword, function(result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
            searchLocation = coords;
            setSearchLocation(coords, keyword);
            map.setLevel(3);
            showStatus(`'${keyword}' 위치로 설정되었습니다!`, 'success');
        } else {
            // 주소 검색 실패 시 키워드 검색 시도
            const ps = new kakao.maps.services.Places();
            ps.keywordSearch(keyword, function(data, status) {
                if (status === kakao.maps.services.Status.OK && data.length > 0) {
                    const coords = new kakao.maps.LatLng(data[0].y, data[0].x);
                    searchLocation = coords;
                    setSearchLocation(coords, data[0].place_name);
                    map.setLevel(3);
                    showStatus(`'${data[0].place_name}' 위치로 설정되었습니다!`, 'success');
                } else {
                    showStatus('검색 결과가 없습니다. 다른 키워드로 시도해주세요.', 'error');
                }
            });
        }
    });
}

// 검색 위치 설정
function setSearchLocation(position, label) {
    searchLocation = position;
    
    // 기존 마커 제거
    if (locationMarker) {
        locationMarker.setMap(null);
    }
    if (locationInfowindow) {
        locationInfowindow.close();
    }
    
    // 새 마커 생성
    locationMarker = new kakao.maps.Marker({
        map: map,
        position: position,
        image: createMarkerImage()
    });
    
    // 정보창 생성
    locationInfowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:8px;font-size:13px;font-weight:bold;color:#667eea;">${label}</div>`
    });
    locationInfowindow.open(map, locationMarker);
    
    // 지도 중심 이동
    map.setCenter(position);
    
    if (locationMode === 'map') {
        showStatus('위치가 선택되었습니다. 조건을 선택하고 검색하세요.', 'success');
    }
}

// 커스텀 마커 이미지 생성
function createMarkerImage() {
    const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
    const imageSize = new kakao.maps.Size(40, 42);
    const imageOption = {offset: new kakao.maps.Point(20, 42)};
    return new kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);
}

// 이벤트 리스너 설정
function setupEventListeners() {
    console.log('이벤트 리스너 설정 시작');
    
    // 위치 모드 버튼 클릭
    const currentLocBtn = document.getElementById('useCurrentLocation');
    const mapLocBtn = document.getElementById('useMapLocation');
    
    console.log('현재 위치 버튼:', currentLocBtn);
    console.log('지도 위치 버튼:', mapLocBtn);
    
    if (currentLocBtn && !currentLocBtn.disabled) {
        currentLocBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('현재 위치 버튼 클릭됨');
            locationMode = 'current';
            document.getElementById('useCurrentLocation').classList.add('active');
            document.getElementById('useMapLocation').classList.remove('active');
            document.getElementById('searchLocationInput').style.display = 'none';
            document.getElementById('locationHelp').textContent = '현재 위치로 검색합니다';
            
            if (userLocation) {
                searchLocation = userLocation;
                setSearchLocation(userLocation, '현재 위치');
                showStatus('현재 위치로 설정되었습니다.', 'success');
            } else {
                getUserLocation();
            }
        });
    }
    
    if (mapLocBtn) {
        mapLocBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('지도 위치 버튼 클릭됨');
            locationMode = 'map';
            document.getElementById('useCurrentLocation').classList.remove('active');
            document.getElementById('useMapLocation').classList.add('active');
            document.getElementById('searchLocationInput').style.display = 'flex';
            document.getElementById('locationHelp').textContent = '주소를 검색하거나 지도를 클릭하세요';
            showStatus('주소를 검색하거나 지도를 클릭해주세요.', 'info');
        });
    }
    
    // 위치 검색 버튼
    const searchLocationBtn = document.getElementById('searchLocationBtn');
    const locationSearchInput = document.getElementById('locationSearchInput');
    
    if (searchLocationBtn && locationSearchInput) {
        searchLocationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const keyword = locationSearchInput.value.trim();
            if (keyword) {
                searchAddress(keyword);
            }
        });
        
        // Enter 키로도 검색 가능
        locationSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = this.value.trim();
                if (keyword) {
                    searchAddress(keyword);
                }
            }
        });
    }
    
    // 모달 닫기 버튼
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            document.getElementById('resultsModal').classList.remove('show');
        });
    }
    
    // 모달 배경 클릭 시 닫기
    const resultsModal = document.getElementById('resultsModal');
    if (resultsModal) {
        resultsModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    }
    
    // 옵션 버튼 클릭
    const optionButtons = document.querySelectorAll('.option-btn');
    console.log('옵션 버튼 개수:', optionButtons.length);
    
    optionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('옵션 버튼 클릭:', this.dataset.category, this.dataset.value);
            
            const category = this.dataset.category;
            const value = this.dataset.value;
            
            // 같은 카테고리의 다른 버튼 비활성화
            document.querySelectorAll(`[data-category="${category}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 현재 버튼 활성화
            this.classList.add('active');
            
            // 선택값 저장
            if (category === 'food-type') {
                selectedPreferences.foodType = value;
                console.log('음식 종류 선택됨:', value);
            } else if (category === 'food-form') {
                selectedPreferences.foodForm = value;
                console.log('음식 형태 선택됨:', value);
            } else if (category === 'distance') {
                selectedPreferences.distance = parseInt(value);
                console.log('거리 선택됨:', value);
            }
        });
    });
    
    // 검색 버튼 클릭
    const searchBtn = document.getElementById('searchBtn');
    console.log('검색 버튼:', searchBtn);
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('검색 버튼 클릭됨');
            searchRestaurants();
        });
    }
    
    // 즐겨찾기 버튼
    const showFavoritesBtn = document.getElementById('showFavorites');
    if (showFavoritesBtn) {
        showFavoritesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            displayFavorites();
        });
    }
    
    // 즐겨찾기 모달 닫기
    const closeFavoritesModal = document.getElementById('closeFavoritesModal');
    if (closeFavoritesModal) {
        closeFavoritesModal.addEventListener('click', function() {
            document.getElementById('favoritesModal').classList.remove('show');
        });
    }
    
    // 즐겨찾기 모달 배경 클릭 시 닫기
    const favoritesModal = document.getElementById('favoritesModal');
    if (favoritesModal) {
        favoritesModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    }
    
    console.log('이벤트 리스너 설정 완료');
}

// 맛집 검색
function searchRestaurants() {
    // 필수 조건 확인
    if (!selectedPreferences.foodType) {
        showStatus('음식 종류를 선택해주세요.', 'error');
        return;
    }
    
    if (!selectedPreferences.distance) {
        showStatus('거리를 선택해주세요.', 'error');
        return;
    }
    
    if (!searchLocation) {
        showStatus('위치 정보를 가져오는 중입니다. 잠시만 기다려주세요.', 'info');
        return;
    }
    
    showStatus('맛집을 검색하는 중입니다...', 'info');
    
    // 기존 마커 제거
    clearMarkers();
    
    // 카카오 Places 서비스 사용
    const ps = new kakao.maps.services.Places();
    
    // 검색 키워드 생성
    const categories = categoryMapping[selectedPreferences.foodType];
    
    // 모든 결과를 저장할 배열
    let allResults = [];
    let completedSearches = 0;
    
    // 각 카테고리별로 검색
    categories.forEach(category => {
        const searchOption = {
            location: searchLocation, // 선택된 위치로 검색
            radius: selectedPreferences.distance,
            sort: kakao.maps.services.SortBy.DISTANCE
        };
        
        ps.keywordSearch(category, function(data, status) {
            completedSearches++;
            
            if (status === kakao.maps.services.Status.OK) {
                allResults = allResults.concat(data);
            }
            
            // 모든 검색 완료 시
            if (completedSearches === categories.length) {
                processResults(allResults);
            }
        }, searchOption);
    });
}

// 검색 결과 처리
function processResults(results) {
    if (results.length === 0) {
        showStatus('조건에 맞는 맛집을 찾을 수 없습니다. 다른 조건으로 시도해보세요.', 'error');
        return;
    }
    
    // 중복 제거 (같은 장소 ID)
    const uniqueResults = [];
    const seenIds = new Set();
    
    results.forEach(place => {
        if (!seenIds.has(place.id)) {
            seenIds.add(place.id);
            uniqueResults.push(place);
        }
    });
    
    // 음식 형태로 필터링 (선택된 경우)
    let filteredResults = uniqueResults;
    if (selectedPreferences.foodForm) {
        const keywords = foodFormKeywords[selectedPreferences.foodForm];
        filteredResults = uniqueResults.filter(place => {
            const placeName = place.place_name.toLowerCase();
            const categoryName = place.category_name.toLowerCase();
            
            return keywords.some(keyword => 
                placeName.includes(keyword.toLowerCase()) || 
                categoryName.includes(keyword.toLowerCase())
            );
        });
    }
    
    // 결과가 없는 경우 - 에러 메시지만 표시하고 종료
    if (filteredResults.length === 0) {
        let errorMsg = '선택하신 키워드에 해당하는 맛집이 없어요 ㅠㅠ';
        if (selectedPreferences.foodForm) {
            errorMsg += `<br><br>💡 팁: "${selectedPreferences.foodForm}" 옵션을 해제하거나, 거리를 더 넓게 설정해보세요!`;
        } else {
            errorMsg += `<br><br>💡 팁: 거리를 더 넓게 설정하거나 다른 위치에서 검색해보세요!`;
        }
        showStatus(errorMsg, 'error');
        return; // 결과 표시하지 않고 종료
    }
    
    // 거리순 정렬 (이미 API에서 정렬되어 있지만 재확인)
    filteredResults.sort((a, b) => parseInt(a.distance) - parseInt(b.distance));
    
    // 결과 표시
    displayResults(filteredResults);
    displayMarkers(filteredResults);
    
    showStatus(`${filteredResults.length}개의 맛집을 찾았습니다!`, 'success');
}

// 대표 메뉴 추론 함수
function guessMenuItems(placeName, categoryName, foodType) {
    const menus = [];
    const lowerName = placeName.toLowerCase();
    const lowerCategory = categoryName.toLowerCase();
    
    // 음식 종류별 키워드로 메뉴 추론
    if (menuKeywords[foodType]) {
        menuKeywords[foodType].forEach(menu => {
            if (lowerName.includes(menu.toLowerCase()) || lowerCategory.includes(menu.toLowerCase())) {
                if (!menus.includes(menu)) {
                    menus.push(menu);
                }
            }
        });
    }
    
    // 최대 1개만 반환
    return menus.slice(0, 1);
}

// 결과 표시
function displayResults(results) {
    const resultsModal = document.getElementById('resultsModal');
    const resultsList = document.getElementById('resultsList');
    const resultCount = document.getElementById('resultCount');
    
    resultsList.innerHTML = '';
    resultCount.textContent = `(${results.length}개)`;
    
    results.forEach((place, index) => {
        const distance = parseInt(place.distance);
        const distanceText = distance >= 1000 
            ? `${(distance / 1000).toFixed(1)}km` 
            : `${distance}m`;
        
        // 도착 예정 시간 계산
        const arrivalTime = calculateArrivalTime(distance);
        
        // 대표 메뉴 추론
        const menuItems = guessMenuItems(place.place_name, place.category_name, selectedPreferences.foodType);
        const menuHTML = menuItems.length > 0 ? `
            <div class="menu">
                <div class="menu-title">대표 메뉴</div>
                <div class="menu-items">
                    ${menuItems.map(menu => `<span class="menu-item">${menu}</span>`).join('')}
                </div>
            </div>
        ` : '';
        
        const item = document.createElement('div');
        item.className = 'result-item';
        
        const isFavorited = FavoritesManager.isFavorite(place.id);
        
        item.innerHTML = `
            <button type="button" class="favorite-btn" data-place-id="${place.id}" onclick="event.stopPropagation();">
                ${isFavorited ? '⭐' : '☆'}
            </button>
            <h3>${index + 1}. ${place.place_name}</h3>
            <span class="category">${place.category_name.split('>').pop().trim()}</span>
            <div class="distance">📍 ${distanceText} · ⏱️ ${arrivalTime}</div>
            <div class="address">${place.address_name}</div>
            ${place.phone ? `<div class="phone">📞 ${place.phone}</div>` : ''}
            ${menuHTML}
        `;
        
        // 즐겨찾기 버튼 이벤트
        const favoriteBtn = item.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(place, this);
        });
        
        // 클릭 시 구글 검색
        item.addEventListener('click', function() {
            const searchQuery = encodeURIComponent(place.place_name + ' ' + place.address_name);
            window.location.href = `https://www.google.com/search?q=${searchQuery}`;
        });
        
        resultsList.appendChild(item);
    });
    
    resultsModal.classList.add('show');
}

// 마커 표시
function displayMarkers(results) {
    results.forEach((place, index) => {
        const position = new kakao.maps.LatLng(place.y, place.x);
        
        const marker = new kakao.maps.Marker({
            map: map,
            position: position,
            title: place.place_name
        });
        
        const distance = parseInt(place.distance);
        const distanceText = distance >= 1000 
            ? `${(distance / 1000).toFixed(1)}km` 
            : `${distance}m`;
        
        const infowindow = new kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;">
                        <strong>${index + 1}. ${place.place_name}</strong><br>
                        ${distanceText}
                      </div>`
        });
        
        kakao.maps.event.addListener(marker, 'mouseover', function() {
            infowindow.open(map, marker);
        });
        
        kakao.maps.event.addListener(marker, 'mouseout', function() {
            infowindow.close();
        });
        
        markers.push(marker);
    });
}

// 마커 제거
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// 상태 메시지 표시 (토스트 알림 사용)
function showStatus(message, type) {
    // HTML 태그 제거하고 텍스트만 추출
    const div = document.createElement('div');
    div.innerHTML = message;
    const textMessage = div.textContent || div.innerText || message;
    
    showToast(textMessage, type);
}

// 즐겨찾기 토글
function toggleFavorite(place, button) {
    const isFavorited = FavoritesManager.isFavorite(place.id);
    
    if (isFavorited) {
        FavoritesManager.removeFavorite(place.id);
        button.textContent = '☆';
    } else {
        FavoritesManager.addFavorite(place);
        button.textContent = '⭐';
        button.classList.add('active');
        setTimeout(() => button.classList.remove('active'), 500);
    }
}

// 즐겨찾기 목록 표시
function displayFavorites() {
    const favoritesModal = document.getElementById('favoritesModal');
    const favoritesList = document.getElementById('favoritesList');
    const favoriteCount = document.getElementById('favoriteCount');
    const emptyMessage = document.getElementById('emptyFavorites');
    
    const favorites = FavoritesManager.getFavorites();
    
    favoritesList.innerHTML = '';
    favoriteCount.textContent = `(${favorites.length}개)`;
    
    if (favorites.length === 0) {
        favoritesList.style.display = 'none';
        emptyMessage.style.display = 'block';
    } else {
        favoritesList.style.display = 'grid';
        emptyMessage.style.display = 'none';
        
        favorites.forEach((place, index) => {
            const distance = parseInt(place.distance || 0);
            const distanceText = distance >= 1000 
                ? `${(distance / 1000).toFixed(1)}km` 
                : distance > 0 ? `${distance}m` : '거리 정보 없음';
            
            const arrivalTime = distance > 0 ? calculateArrivalTime(distance) : '';
            
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
                <button type="button" class="favorite-btn" data-place-id="${place.id}" onclick="event.stopPropagation();">⭐</button>
                <h3>${index + 1}. ${place.place_name}</h3>
                <span class="category">${place.category_name ? place.category_name.split('>').pop().trim() : '음식점'}</span>
                <div class="distance">📍 ${distanceText}${arrivalTime ? ' · ⏱️ ' + arrivalTime : ''}</div>
                <div class="address">${place.address_name}</div>
                ${place.phone ? `<div class="phone">📞 ${place.phone}</div>` : ''}
            `;
            
            // 즐겨찾기 제거 버튼
            const favoriteBtn = item.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                FavoritesManager.removeFavorite(place.id);
                displayFavorites(); // 목록 새로고침
            });
            
            // 클릭 시 구글 검색
            item.addEventListener('click', function() {
                const searchQuery = encodeURIComponent(place.place_name + ' ' + place.address_name);
                window.location.href = `https://www.google.com/search?q=${searchQuery}`;
            });
            
            favoritesList.appendChild(item);
        });
    }
    
    favoritesModal.classList.add('show');
}
