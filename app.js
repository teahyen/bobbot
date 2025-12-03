// 전역 변수
let map;
let markers = [];
let userLocation = null;
let searchLocation = null; // 검색에 사용할 위치
let locationMode = 'current'; // 'current' 또는 'map'
let locationMarker = null; // 위치 표시 마커
let locationInfowindow = null; // 위치 정보창
let selectedPreferences = {
    foodType: null,
    foodForm: null,
    distance: null
};

// 음식 카테고리 매핑
const categoryMapping = {
    '한식': ['한식'],
    '중식': ['중식', '중국집', '중국요리'],
    '일식': ['일식', '돈까스', '회', '초밥', '라멘'],
    '양식': ['양식', '이탈리안', '스테이크', '햄버거', '파스타']
};

// 음식 형태 키워드 매핑
const foodFormKeywords = {
    '밥': ['덮밥', '비빔밥', '볶음밥', '쌈밥', '정식', '백반', '한정식', '고기', '삼겹살', '갈비'],
    '빵': ['베이커리', '샌드위치', '토스트', '햄버거', '빵', '파니니'],
    '면': ['국수', '라면', '우동', '소바', '파스타', '짜장', '짬뽕', '냉면', '칼국수', '쌀국수']
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
    
    // 사용자 위치 가져오기
    getUserLocation();
}

// 사용자 위치 가져오기
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
                showStatus('위치 정보를 가져올 수 없습니다. 기본 위치(서울 시청)로 검색합니다.', 'info');
                userLocation = new kakao.maps.LatLng(37.5665, 126.9780);
                searchLocation = userLocation;
                setSearchLocation(userLocation, '기본 위치');
            }
        );
    } else {
        showStatus('브라우저가 위치 서비스를 지원하지 않습니다.', 'error');
        userLocation = new kakao.maps.LatLng(37.5665, 126.9780);
        searchLocation = userLocation;
        setSearchLocation(userLocation, '기본 위치');
    }
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
    
    if (currentLocBtn) {
        currentLocBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('현재 위치 버튼 클릭됨');
            locationMode = 'current';
            document.getElementById('useCurrentLocation').classList.add('active');
            document.getElementById('useMapLocation').classList.remove('active');
            document.getElementById('locationHelp').textContent = '현재 위치로 검색합니다';
            
            if (userLocation) {
                searchLocation = userLocation;
                setSearchLocation(userLocation, '현재 위치');
                showStatus('현재 위치로 설정되었습니다.', 'success');
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
            document.getElementById('locationHelp').textContent = '지도를 클릭하여 위치를 선택하세요';
            showStatus('지도에서 위치를 클릭해주세요.', 'info');
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
    
    // 결과가 없는 경우
    if (filteredResults.length === 0) {
        showStatus(`${selectedPreferences.foodForm} 종류의 맛집을 찾을 수 없습니다. 음식 형태 조건을 해제하거나 변경해보세요.`, 'info');
        filteredResults = uniqueResults; // 형태 필터 없이 표시
    }
    
    // 거리순 정렬 (이미 API에서 정렬되어 있지만 재확인)
    filteredResults.sort((a, b) => parseInt(a.distance) - parseInt(b.distance));
    
    // 결과 표시
    displayResults(filteredResults);
    displayMarkers(filteredResults);
    
    showStatus(`${filteredResults.length}개의 맛집을 찾았습니다!`, 'success');
}

// 결과 표시
function displayResults(results) {
    const resultsPanel = document.getElementById('resultsPanel');
    const resultsList = document.getElementById('resultsList');
    const resultCount = document.getElementById('resultCount');
    
    resultsList.innerHTML = '';
    resultCount.textContent = `(${results.length}개)`;
    
    results.forEach((place, index) => {
        const distance = parseInt(place.distance);
        const distanceText = distance >= 1000 
            ? `${(distance / 1000).toFixed(1)}km` 
            : `${distance}m`;
        
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h3>${index + 1}. ${place.place_name}</h3>
            <span class="category">${place.category_name.split('>').pop().trim()}</span>
            <div class="distance">📍 ${distanceText}</div>
            <div class="address">${place.address_name}</div>
            ${place.phone ? `<div class="phone">📞 ${place.phone}</div>` : ''}
        `;
        
        // 클릭 시 지도에서 해당 위치로 이동
        item.addEventListener('click', function() {
            const position = new kakao.maps.LatLng(place.y, place.x);
            map.setCenter(position);
            map.setLevel(3);
        });
        
        resultsList.appendChild(item);
    });
    
    resultsPanel.classList.add('show');
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

// 상태 메시지 표시
function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status-message';
        }, 5000);
    }
}
